import bootstrap  # noqa: F401

from app.transcript_fetcher import chunk_text

with open("data/video_data.json", "r", encoding="utf-8") as f:
    pass  # or just paste your transcript string directly

transcript = "...your 75132-char transcript..."  # or pull it from wherever you have it
chunks = chunk_text(transcript)
print("Word count:", len(transcript.split()))
print("Number of chunks:", len(chunks))