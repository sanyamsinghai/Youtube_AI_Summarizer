import time
import os
from youtube_transcript_api import NoTranscriptFound, YouTubeTranscriptApi
from youtube_transcript_api.proxies import WebshareProxyConfig
from dotenv import load_dotenv
from requests import Session

load_dotenv()

proxy_user = os.getenv("WEBSHARE_PROXY_USER")
proxy_pass = os.getenv("WEBSHARE_PROXY_PASS")

# API instance with proxies (if configured)
api_proxied = None
if proxy_user and proxy_pass:
    session_proxied = Session()
    session_proxied.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
    })
    api_proxied = YouTubeTranscriptApi(
        http_client=session_proxied,
        proxy_config=WebshareProxyConfig(
            proxy_username=proxy_user,
            proxy_password=proxy_pass,
        )
    )

# API instance direct (always browser User-Agent)
session_direct = Session()
session_direct.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
})
api_direct = YouTubeTranscriptApi(http_client=session_direct)

def get_transcript(video_id, retries=2, delay_seconds=2):
    if video_id is None:
        return None
    last_error = None

    # Step 1: Try using the proxied API (if configured)
    if api_proxied:
        print(f"Attempting to fetch transcript using proxies for video {video_id}...")
        for attempt in range(retries + 1):
            try:
                try:
                    transcript = api_proxied.fetch(video_id, languages=["en"])
                except NoTranscriptFound:
                    available = api_proxied.list(video_id)
                    first_available = next(iter(available))
                    transcript = first_available.fetch()

                print(f"Successfully fetched transcript using proxies for video {video_id}.")
                return " ".join(segment.text for segment in transcript)

            except Exception as e:
                last_error = e
                message = str(e)
                print(f"Proxy attempt {attempt + 1} failed: {message}")
                if "blocking requests" in message or "IPBlocked" in message or "RequestBlocked" in message or "429" in message:
                    # If explicitly rate limited or blocked, we wait before retrying
                    if attempt < retries:
                        time.sleep(delay_seconds * (attempt + 1))
                elif "Subtitles are disabled" in message:
                    # No point in retrying if subtitles are disabled
                    break

    # Step 2: Fall back to direct connection using browser User-Agent
    print(f"Attempting to fetch transcript directly (with browser User-Agent) for video {video_id}...")
    for attempt in range(retries + 1):
        try:
            try:
                transcript = api_direct.fetch(video_id, languages=["en"])
            except NoTranscriptFound:
                available = api_direct.list(video_id)
                first_available = next(iter(available))
                transcript = first_available.fetch()

            print(f"Successfully fetched transcript directly for video {video_id}.")
            return " ".join(segment.text for segment in transcript)

        except Exception as e:
            last_error = e
            message = str(e)
            print(f"Direct attempt {attempt + 1} failed: {message}")
            if "blocking requests" in message or "IPBlocked" in message or "RequestBlocked" in message or "429" in message:
                if attempt < retries:
                    time.sleep(delay_seconds * (attempt + 1))
            elif "Subtitles are disabled" in message:
                break

    print(f"Failed to fetch transcript for video ID {video_id} under all methods: {last_error}")
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

