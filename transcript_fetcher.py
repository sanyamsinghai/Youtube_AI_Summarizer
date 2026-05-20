import time

from youtube_transcript_api import NoTranscriptFound, YouTubeTranscriptApi

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
                # Fallback to any available language
                transcript = api.fetch(video_id)

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
    
def chunk_text(text, chunk_size=500):
    words = text.split()
    chunks = []
    
    for i in range(0, len(words), chunk_size):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)
    
    return chunks

