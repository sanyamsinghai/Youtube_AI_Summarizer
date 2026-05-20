from groq import Groq
from prompts import STYLES
from dotenv import load_dotenv
from transcript_fetcher import chunk_text
import os


load_dotenv()
api_key = os.getenv("GROQ_API_KEY")

client = Groq(api_key=api_key)

def summarize_chunk(chunk, style):
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": STYLES[style]},
            {"role": "user", "content": chunk}
        ]
    )
    try:
        content = response.choices[0].message.content
    except (IndexError, AttributeError):
        content = None  # handle missing/changed response shape
    return content

def summarize_transcript(transcript, style):
    # split transcript into 500 char chunks
    chunks = chunk_text(transcript)
    summaries = []
    for chunk in chunks:
        summary = summarize_chunk(chunk, style)
        if summary:
            summaries.append(summary)
    merged = "\n".join(summaries)
    final = summarize_chunk(merged, style)
    return final

