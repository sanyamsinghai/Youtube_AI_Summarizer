from urllib.parse import urlparse, parse_qs
import requests
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("YOUTUBE_API_KEY")

def extract_video_id(url):

    video_id = None

    if "youtu.be" in url:
        path = urlparse(url).path
        video_id = path.split("/")[-1]
        
    elif "youtube.com" in url:
        path = urlparse(url).path

        if "/embed/" in url or "/live/" in url or "/shorts/" in url:
            video_id = path.split("/")[-1]
            
        else:
            query = urlparse(url).query
            video_id = parse_qs(query).get("v", [None])[0]

    return video_id


def get_video_title(video_id):
    """
    Fetch the title for a YouTube video ID using the YouTube Data API.
    """
    if not video_id:
        return None

    params = {
        "part": "snippet",
        "id": video_id,
        "key": api_key,
    }

    try:
        response = requests.get("https://www.googleapis.com/youtube/v3/videos", params=params)
        response.raise_for_status()
        result = response.json()

        if "items" in result and len(result["items"]) > 0:
            return result["items"][0]["snippet"].get("title")

        return None
    except requests.RequestException as e:
        print(f"Error fetching video title: {e}")
        return None
    
def get_channel_id(url):
    """
    Extract channel ID from various YouTube URL formats:
    - youtube.com/channel/UC... (explicit channel ID)
    - youtube.com/c/channelname (custom URL)
    - youtube.com/@handle (handle format)
    """
    channel_id = None

    try:
        # Format 1: Explicit channel ID
        if "youtube.com/channel/" in url:
            path = urlparse(url).path
            channel_id = path.split("/")[-1]
            return channel_id
        
        # Format 2: YouTube handle (@handle)
        elif "youtube.com/@" in url:
            path = urlparse(url).path
            handle = path.split("/")[-1].strip().lstrip("@")
            
            if not handle:
                print("Invalid YouTube channel URL: Could not extract handle")
                return None
            
            # Use YouTube API to look up the channel ID by handle
            params = {
                "part": "id",
                "forHandle": handle,
                "key": api_key
            }
            
            try:
                response = requests.get("https://www.googleapis.com/youtube/v3/channels", params=params)
                response.raise_for_status()
                result = response.json()
                
                if "items" in result and len(result["items"]) > 0:
                    channel_id = result["items"][0]["id"]
                    return channel_id
                else:
                    print(f"Channel not found for handle: @{handle}")
                    return None
            except requests.RequestException as e:
                print(f"Error fetching channel ID: {e}")
                return None

        # Format 3: Legacy custom username (/c/ or old username-based channels)
        elif "youtube.com/c/" in url:
            path = urlparse(url).path
            username = path.split("/")[-1].strip()

            if not username:
                print("Invalid YouTube channel URL: Could not extract username")
                return None

            params = {
                "part": "id",
                "forUsername": username,
                "key": api_key
            }

            try:
                response = requests.get("https://www.googleapis.com/youtube/v3/channels", params=params)
                response.raise_for_status()
                result = response.json()

                if "items" in result and len(result["items"]) > 0:
                    channel_id = result["items"][0]["id"]
                    return channel_id
                else:
                    print(f"Channel not found for username: {username}")
                    return None
            except requests.RequestException as e:
                print(f"Error fetching channel ID: {e}")
                return None
        
        else:
            print("Unsupported YouTube channel URL format")
            return None
    
    except (IndexError, AttributeError) as e:
        print(f"Error parsing channel URL: {e}")
        return None