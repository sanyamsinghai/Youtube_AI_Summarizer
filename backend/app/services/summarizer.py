from groq import Groq, RateLimitError
from backend.app.core.prompts import STYLES, LANGUAGE_INSTRUCTION
from dotenv import load_dotenv
from backend.app.services.transcript_fetcher import chunk_text
import os


load_dotenv()
api_key = os.getenv("GROQ_API_KEY")
model_name = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

client = Groq(api_key=api_key)

def summarize_chunk(chunk, style, system_prompt=None):
    if system_prompt is None:
        system_prompt = STYLES.get(style, "You are a helpful assistant.") + LANGUAGE_INSTRUCTION
    
    try:
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": chunk}
            ]
        )
    except RateLimitError:
        print("Groq daily token limit reached. Please try again later.")
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

def summarize_transcript(transcript, style):
    print(f"[GROQ CALL] summarizing with style={style} using model={model_name}")
    # split transcript into smaller word chunks to stay under the model limit
    chunks = chunk_text(transcript)

    if not chunks:
        return None

    if len(chunks) == 1:
        return summarize_chunk(chunks[0], style)

    summaries = []

    for chunk in chunks:
        summary = summarize_chunk(chunk, style)
        if summary:
            summaries.append(summary)

    if not summaries:
        return None

    return combine_summaries(summaries, style)

