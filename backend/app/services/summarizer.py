from groq import Groq, RateLimitError
from backend.app.core.prompts import STYLES, LANGUAGE_INSTRUCTION
from dotenv import load_dotenv
from backend.app.services.transcript_fetcher import chunk_text
import os


class ServiceUnavailableError(Exception):
    """Raised when the AI provider is rate-limited or temporarily unavailable."""
    pass


load_dotenv()
api_key = os.getenv("GROQ_API_KEY")

# Improvement 3 reverted: moonshotai/kimi-k2-instruct is not on Groq free tier
# llama-3.3-70b-versatile is the best model available on the free tier
model_name = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

# Improvement 2: Lower temperature for more precise, factual output (default was 1.0)
TEMPERATURE = float(os.getenv("GROQ_TEMPERATURE", "0.4"))

client = Groq(api_key=api_key)


def summarize_chunk(chunk, style, system_prompt=None):
    if system_prompt is None:
        system_prompt = STYLES.get(style, "You are a helpful assistant.") + LANGUAGE_INSTRUCTION
    
    try:
        response = client.chat.completions.create(
            model=model_name,
            temperature=TEMPERATURE,  # Improvement 2: precise, low-hallucination output
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": chunk}
            ]
        )
    except RateLimitError as e:
        print(f"\n[RATE LIMIT] Groq API rate/token limit reached: {e}\n")
        raise ServiceUnavailableError("rate_limit")
    except Exception as e:
        print(f"\n[API ERROR] Unexpected failure calling Groq: {e}\n")
        return None
    try:
        content = response.choices[0].message.content
    except (IndexError, AttributeError):
        content = None  # handle missing/changed response shape
    return content


def combine_summaries(summaries, style, batch_size=4):
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
                system_prompt=system_prompt
            )

            if combined:
                next_round.append(combined)
            else:
                next_round.append(batch_text)

        current = next_round

    return current[0]


def summarize_transcript(transcript, style, title=None):
    print(f"[GROQ CALL] summarizing with style={style} using model={model_name} temperature={TEMPERATURE}")

    # Improvement 1: Inject video title at the top of every chunk so the model
    # has richer context about what it is summarizing
    title_prefix = f'Video Title: "{title}"\n\n' if title else ""

    chunks = chunk_text(transcript)

    if not chunks:
        return None

    if len(chunks) == 1:
        user_content = title_prefix + "Transcript:\n" + chunks[0]
        return summarize_chunk(user_content, style)

    summaries = []

    for i, chunk in enumerate(chunks):
        # Inject title on first chunk only to avoid repetition on merge chunks
        prefix = title_prefix if i == 0 else ""
        user_content = prefix + "Transcript segment:\n" + chunk
        summary = summarize_chunk(user_content, style)
        if summary:
            summaries.append(summary)

    if not summaries:
        return None

    return combine_summaries(summaries, style)
