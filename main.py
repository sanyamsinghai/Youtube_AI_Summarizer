from transcript_fetcher import get_transcript
from extractor import extract_video_id
from video_data import get_response

# url = "https://www.youtube.com/watch?v=gR56_0NTJNs"
url = input("Enter YouTube video URL: ")

video_id = extract_video_id(url)

if video_id:
    transcript = get_transcript(video_id)
    print(transcript)
else:
    print("Invalid YouTube URL")