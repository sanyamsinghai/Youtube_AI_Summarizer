from groq import Groq, RateLimitError
from backend.app.core.prompts import STYLES
from dotenv import load_dotenv
from backend.app.services.transcript_fetcher import chunk_text
import os


load_dotenv()
api_key = os.getenv("GROQ_API_KEY")

client = Groq(api_key=api_key)

def summarize_chunk(chunk, style):
    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {"role": "system", "content": STYLES[style]},
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
            batch_text = "\n\n".join(f"- {item}" for item in batch)
            combined = summarize_chunk(
                "Combine these partial summaries into one coherent summary in the same style. Remove repetition and keep only the important points.\n\n"
                + batch_text,
                style,
            )

            if combined:
                next_round.append(combined)
            else:
                next_round.append(batch_text)

        current = next_round

    return current[0]

def summarize_transcript(transcript, style):
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

