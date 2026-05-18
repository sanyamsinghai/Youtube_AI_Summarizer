from youtube_transcript_api import YouTubeTranscriptApi,NoTranscriptFound

api = YouTubeTranscriptApi()

def get_transcript(video_id):
    if video_id is None:
        return None
    try:
        try:
            transcript = api.fetch(video_id, languages=["en"])

        except NoTranscriptFound:
            # Fallback to any available language
            transcript = api.fetch(video_id)

        return " ".join(segment.text for segment in transcript)
    
    except Exception as e:
        print(f"Error fetching transcript for video ID {video_id}: {e}")
        return None 
    
def chunk_text(text, chunk_size=500):
    words = text.split()
    chunks = []
    
    for i in range(0, len(words), chunk_size):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)
    
    return chunks

