from groq import Groq, RateLimitError
from backend.app.core.prompts import STYLES, LANGUAGE_INSTRUCTION
from dotenv import load_dotenv
from backend.app.services.transcript_fetcher import chunk_text
import os
import time
import re
from backend.app.database import SessionLocal
from backend.app.models import PartialSummary



class ServiceUnavailableError(Exception):
    """Raised when the AI provider is rate-limited or temporarily unavailable."""
    pass


load_dotenv()
api_key = os.getenv("GROQ_API_KEY")

# The fast, high-rate-limit 8B model used for individual chunks (Map stage)
MAP_MODEL = os.getenv("GROQ_MAP_MODEL", "llama-3.1-8b-instant")

# The powerful, premium 70B model used for the final consolidation (Reduce stage)
REDUCE_MODEL = os.getenv("GROQ_REDUCE_MODEL", "llama-3.3-70b-versatile")

# Improvement 2: Lower temperature for more precise, factual output (default was 1.0)
TEMPERATURE = float(os.getenv("GROQ_TEMPERATURE", "0.4"))

client = Groq(api_key=api_key)


def summarize_chunk(chunk, style, system_prompt=None, max_retries=3, initial_delay=4.0, model=None):
    if model is None:
        model = REDUCE_MODEL

    if system_prompt is None:
        system_prompt = STYLES.get(style, "You are a helpful assistant.") + LANGUAGE_INSTRUCTION
    
    delay = initial_delay
    for attempt in range(max_retries + 1):
        try:
            response = client.chat.completions.create(
                model=model,
                temperature=TEMPERATURE,  # Improvement 2: precise, low-hallucination output
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": chunk}
                ]
            )
            try:
                content = response.choices[0].message.content
            except (IndexError, AttributeError):
                content = None

            return content

        except RateLimitError as e:
            if attempt == max_retries:
                print(f"\n[RATE LIMIT] Groq API rate/token limit reached after {max_retries} retries: {e}\n")
                raise ServiceUnavailableError("rate_limit")
            
            # Determine how long to wait (parse from headers or message)
            retry_after = 3.0
            try:
                if hasattr(e, "response") and e.response is not None:
                    headers = e.response.headers
                    if "retry-after" in headers:
                        retry_after = float(headers["retry-after"]) + 0.5
            except Exception:
                pass

            if retry_after == 3.0:
                match = re.search(r"try again in ([\d\.]+)s", str(e), re.IGNORECASE)
                if match:
                    retry_after = float(match.group(1)) + 0.5

            # If the wait time is too long (e.g. daily/hourly limit hit), fail immediately
            if retry_after > 20.0:
                print(f"\n[RATE LIMIT] Cooldown time of {retry_after:.2f}s is too long (Daily limit likely hit). Failing request immediately.\n")
                raise ServiceUnavailableError("rate_limit")

            # Wait and display info
            wait_time = max(retry_after, delay)
            print(f"\n[RATE LIMIT] Hit rate limit. Waiting {wait_time:.2f}s before retry {attempt + 1}/{max_retries}...\n")
            time.sleep(wait_time)
            delay *= 2.0  # Exponential backoff

        except Exception as e:
            print(f"\n[API ERROR] Unexpected failure calling Groq: {e}\n")
            return None


def combine_summaries(summaries, style, batch_size=4, model=REDUCE_MODEL):
    current = summaries[:]

    while len(current) > 1:
        next_round = []

        for i in range(0, len(current), batch_size):
            batch = current[i:i + batch_size]
            batch_text = "\n\n".join(f"--- Partial Summary {idx+1} ---\n{item}" for idx, item in enumerate(batch))
            
            system_prompt = (
                f"You are a professional editor. Combine multiple partial summaries into a single, cohesive, high-quality summary. "
                f"You must strictly adhere to the requested output style guidelines:\n{STYLES[style]}"
            ) + LANGUAGE_INSTRUCTION
            
            combined = summarize_chunk(
                "Please combine the following partial summaries. Eliminate repetition, maintain consistent formatting, preserve key facts/metrics, and merge them into a single coherent output:\n\n" + batch_text,
                style,
                system_prompt=system_prompt,
                model=model
            )

            if combined:
                next_round.append(combined)
            else:
                next_round.append(batch_text)

        current = next_round

    return current[0]


def summarize_transcript(transcript, style, title=None, video_id=None):
    print(f"[GROQ CALL] summarizing with style={style} using map_model={MAP_MODEL} and reduce_model={REDUCE_MODEL}")

    # Improvement 1: Inject video title at the top of every chunk so the model
    # has richer context about what it is summarizing
    title_prefix = f'Video Title: "{title}"\n\n' if title else ""

    # Reverted dynamic chunk size stuff to standard/default (2500 words per chunk)
    chunks = chunk_text(transcript)

    if not chunks:
        return None

    if len(chunks) == 1:
        user_content = title_prefix + "Transcript:\n" + chunks[0]
        # Only 1 chunk total, can run directly on the premium 70B model
        return summarize_chunk(user_content, style, model=REDUCE_MODEL)

    # 1. Fetch any cached chunks from DB if video_id is provided
    completed_chunks = {}
    if video_id:
        db = SessionLocal()
        try:
            existing = db.query(PartialSummary).filter(
                PartialSummary.video_id == video_id,
                PartialSummary.style == style
            ).all()
            completed_chunks = {item.chunk_index: item.summary_text for item in existing}
            if completed_chunks:
                print(f"[CACHE] Found {len(completed_chunks)} completed segments for video {video_id}.")
        except Exception as e:
            print(f"[CACHE ERROR] Failed to load partial summaries: {e}")
        finally:
            db.close()



    summaries = []

    # 2. Iterate chunks and generate summary if not cached
    for i, chunk in enumerate(chunks):
        if i in completed_chunks:
            # Re-use cached chunk summary
            summaries.append(completed_chunks[i])
            continue

        prefix = title_prefix if i == 0 else ""
        user_content = prefix + "Transcript segment:\n" + chunk
        summary = summarize_chunk(user_content, style, model=MAP_MODEL)
        if summary:
            summaries.append(summary)
            # Save this chunk to database immediately
            if video_id:
                db = SessionLocal()
                try:
                    part = PartialSummary(
                        video_id=video_id,
                        style=style,
                        chunk_index=i,
                        summary_text=summary
                    )
                    db.add(part)
                    db.commit()
                except Exception as e:
                    print(f"[CACHE ERROR] Failed to save partial summary for chunk {i}: {e}")
                    db.rollback()
                finally:
                    db.close()

    if len(summaries) < len(chunks):
        # We failed to generate all chunk summaries (e.g. rate limit error hit mid-way)
        return None

    # 3. Combine summaries
    final_summary = combine_summaries(summaries, style, model=REDUCE_MODEL)

    # Clean up partial summaries upon successful combination
    if final_summary and video_id:
        db = SessionLocal()
        try:
            db.query(PartialSummary).filter(
                PartialSummary.video_id == video_id,
                PartialSummary.style == style
            ).delete()
            db.commit()
            print(f"[CACHE] Cleared partial summaries for video {video_id} upon successful completion.")
        except Exception as e:
            print(f"[CACHE ERROR] Failed to clean partial summaries: {e}")
            db.rollback()
        finally:
            db.close()

    return final_summary
