import json
import os
import time

from transcript_fetcher import get_transcript
from extractor import get_channel_id
from video_data import get_response,filter_video_data,save_to_json
from summarizer import summarize_transcript, summarize_chunk
from prompts import STYLES

# 1. Channel URL → extract channel ID
# 2. Channel ID → fetch 10 videos (get_response + filter_video_data)
# 3. For each video → use videoId → fetch transcript
# 4. Combine video data + transcript
# 5. Save everything to JSON



channel_url = input("Enter YouTube channel URL: ")  # input here
channel_id = get_channel_id(channel_url)  # extract ID

#       added for debugging
#       print("Channel ID:", channel_id)  # add this line to check if ID is extracted correctly

#       raw = get_response(channel_id)
#       print("Raw response:", raw)  # add this
#       response = filter_video_data(raw)


if channel_id is None:
    print("Invalid Channel URL")

else:
    response = filter_video_data(get_response(channel_id))
    if response is not None:
        transcript = None
        for video in response:
            video_id = video.get("videoId")
            transcript = get_transcript(video_id)
            video["transcript"] = transcript
            if transcript:
                print("Testing with:", video.get("title"))
                break
            time.sleep(1.5)
        save_to_json(response)
    else:
        print("no video data found for the channel")




if not os.path.exists("video_data.json"):
    print("video_data.json not found. Run the script to fetch videos first (provide a channel URL).")
    raise SystemExit(1)

try:
    with open("video_data.json", "r", encoding="utf-8") as f:
        videos = json.load(f)
except json.JSONDecodeError:
    print("video_data.json exists but is not valid JSON. Remove or fix the file and retry.")
    raise

transcript = None
for video in videos:
    if video.get("transcript"):
        transcript = video["transcript"]
        break

if transcript:
    print("hold on, summarizing...")
    valid_styles = ["bullet", "student", "narrative", "action", "cheatsheet", "eli5", "q&a", "executive brief"]
    print("\nPick a style: bullet, student, narrative, action, cheatsheet, eli5, q&a, executive brief")
    style = input("Enter style: ").strip().lower()
    
    if style in valid_styles:
        print("Summarizing...")
        result = summarize_transcript(transcript, style)
        print(result)
    else:
        print("Invalid style.")
else:
    print("No transcript found for any video. Make sure transcripts were fetched and saved.")
    print("Tip: YouTube may be blocking requests from your IP. Try again later or use a VPN.")

