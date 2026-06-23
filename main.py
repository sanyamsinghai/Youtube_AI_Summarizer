import json
import os
import time
from datetime import datetime, timezone

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


def save_summary_to_json(summary_data, filename="summary_data.json"):
    summaries = []

    if os.path.exists(filename):
        try:
            with open(filename, "r", encoding="utf-8") as f:
                existing_data = json.load(f)
            if isinstance(existing_data, list):
                summaries = existing_data
            elif isinstance(existing_data, dict):
                summaries = [existing_data]
        except json.JSONDecodeError:
            summaries = []

    summaries.append(summary_data)

    with open(filename, "w", encoding="utf-8") as f:
        json.dump(summaries, f, indent=4, ensure_ascii=False)



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
        for video in response:
            video_id = video.get("videoId")
            transcript = get_transcript(video_id)
            video["transcript"] = transcript
            if transcript:
                print("Testing with:", video.get("title"))
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
        selected_video = next((video for video in videos if video.get("transcript")), None)
        summary_record = {
            "sourceVideo": {
                "channelTitle": selected_video.get("channelTitle") if selected_video else None,
                "channelId": selected_video.get("channelId") if selected_video else None,
                "title": selected_video.get("title") if selected_video else None,
                "publishedAt": selected_video.get("publishedAt") if selected_video else None,
                "videoId": selected_video.get("videoId") if selected_video else None,
            },
            "style": style,
            "summary": result,
            "generatedAt": datetime.now(timezone.utc).isoformat()
        }
        save_summary_to_json(summary_record)
        print("Summary saved to summary_data.json")
        print("\n--- Summary ---\n")
        print(result)
    else:
        print("Invalid style.")
else:
    print("No transcript found for any video. Make sure transcripts were fetched and saved.")
    print("Tip: YouTube may be blocking requests from your IP. Try again later or use a VPN.")

