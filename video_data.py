import requests
from dotenv import load_dotenv
import os
from extractor import extract_video_id, get_channel_id
import json

load_dotenv()
api_key = os.getenv("YOUTUBE_API_KEY")

def get_response(channel_id):
    # Supports all YouTube channel URL formats: /channel/, /c/, and @handle
    # (handled by get_channel_id in extractor.py)

    if channel_id is None:
        print("Invalid Channel ID")
        return None

    params = {
        "channelId": channel_id, 
        "part" : "snippet",
        "key" : api_key,
        "maxResults": 10,
        "type": "video"
    }

    try:
        response = requests.get("https://www.googleapis.com/youtube/v3/search", params=params)
        response.raise_for_status()
        result = response.json()
        return result
    except requests.RequestException as e:
        print(f"Error fetching video data: {e}")

def filter_video_data(raw_data):

    if raw_data is None or "items" not in raw_data or len(raw_data["items"]) == 0:
        print("No video data found")
        return None

    # data = raw_data["items"][0]["snippet"]
    videos = []

    for items in raw_data["items"]:
        video_data = items["snippet"]
        final_data = {
            "channelTitle": video_data.get("channelTitle"),
            "channelId": video_data.get("channelId"),
            "title": video_data.get("title"),
            "publishedAt": video_data.get("publishedAt"),
            "videoId": items["id"]["videoId"]
        }
        videos.append(final_data)
    
    return videos

def save_to_json(data, filename="video_data.json"):
    with open(filename, "w") as f:
        json.dump(data, f, indent=4)
