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

