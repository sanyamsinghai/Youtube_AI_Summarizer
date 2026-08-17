import time
import os
from youtube_transcript_api import NoTranscriptFound, YouTubeTranscriptApi
from youtube_transcript_api.proxies import WebshareProxyConfig
from dotenv import load_dotenv

load_dotenv()

proxy_user = os.getenv("WEBSHARE_PROXY_USER")
proxy_pass = os.getenv("WEBSHARE_PROXY_PASS")

if proxy_user and proxy_pass:
    api = YouTubeTranscriptApi(
        proxy_config=WebshareProxyConfig(
            proxy_username=proxy_user,
            proxy_password=proxy_pass,
        )
    )
else:
    api = YouTubeTranscriptApi()

def get_transcript(video_id, retries=2, delay_seconds=2):
    if video_id is None:
        return None
    last_error = None

    for attempt in range(retries + 1):
        try:
            try:
                transcript = api.fetch(video_id, languages=["en"])
            except NoTranscriptFound:
                # fetch() with no languages arg STILL defaults to ('en',), so it
                # can't be used as a "give me anything" fallback. list() instead
                # returns every transcript actually available for this video,
                # in whatever language it was captioned/auto-captioned in —
                # we just grab the first one and fetch that specific object.
                available = api.list(video_id)
                first_available = next(iter(available))
                transcript = first_available.fetch()

            return " ".join(segment.text for segment in transcript)

        except Exception as e:
            last_error = e
            message = str(e)

            if "blocking requests" in message or "IPBlocked" in message or "RequestBlocked" in message:
                print(f"Transcript request blocked for video ID {video_id}. Waiting before retrying...")
            elif "Subtitles are disabled" in message:
                print(f"No subtitles available for video ID {video_id}.")
                return None
            else:
                print(f"Error fetching transcript for video ID {video_id}: {e}")

            if attempt < retries:
                time.sleep(delay_seconds * (attempt + 1))

    print(f"Failed to fetch transcript for video ID {video_id}: {last_error}")
    return None 
    
def chunk_text(text, chunk_size=2500):
    """
    Split transcript text into word chunks.

    A chunk_size of 2500 words is highly safe. Non-English languages (like Hindi or
    French) have a much higher token-to-word ratio (up to 3x). Using 2500 words ensures 
    that the request stays safely under Groq's 12K TPM limit.
    """
    words = text.split()
    chunks = []
    
    for i in range(0, len(words), chunk_size):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)
    
    return chunks

