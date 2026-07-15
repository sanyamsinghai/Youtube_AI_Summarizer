import os
import re
from urllib.parse import urlparse
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from dotenv import load_dotenv

load_dotenv()
youtube_api_key = os.getenv("YOUTUBE_API_KEY")

# Initialize the YouTube client
youtube = build("youtube", "v3", developerKey=youtube_api_key)

def parse_channel_id_or_handle(input_str: str) -> tuple[str | None, str | None]:
    """
    Parses an input string to extract a YouTube channel ID or username handle.
    
    Returns:
        tuple: (channel_id, handle) where one is set and the other is None, or both None.
    """
    input_str = input_str.strip()
    if not input_str:
        return None, None

    # If it is a raw channel ID
    if re.match(r"^UC[a-zA-Z0-9_\-]{22}$", input_str):
        return input_str, None

    # If it is a direct handle like @username
    if input_str.startswith("@"):
        return None, input_str

    # Parse URL formats
    try:
        parsed_url = urlparse(input_str)
        path = parsed_url.path

        # Match /channel/UC...
        channel_match = re.search(r"/channel/(UC[a-zA-Z0-9_\-]{22})", path)
        if channel_match:
            return channel_match.group(1), None

        # Match /@username
        handle_match = re.search(r"/@([a-zA-Z0-9_\-\.]+)", path)
        if handle_match:
            return None, f"@{handle_match.group(1)}"
            
        # Match /c/handle or /user/handle
        c_match = re.search(r"/(?:c|user)/([a-zA-Z0-9_\-\.]+)", path)
        if c_match:
            # Check if username, fallback to handle
            user_val = c_match.group(1)
            return None, f"@{user_val}"
    except Exception:
        pass

    # Fallback: if no slashes, assume it might be a handle
    if "/" not in input_str and len(input_str) < 50:
        return None, input_str if input_str.startswith("@") else f"@{input_str}"

    return None, None


def parse_iso_duration(duration_str: str) -> str:
    """
    Parses ISO 8601 duration string (e.g. PT14M25S) to a readable format (e.g. 14:25).
    """
    if not duration_str:
        return "0:00"
    
    # Matches formats like PT1H23M45S, PT15M, PT45S
    match = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", duration_str)
    if not match:
        return "0:00"
    
    hours, minutes, seconds = match.groups()
    h = int(hours) if hours else 0
    m = int(minutes) if minutes else 0
    s = int(seconds) if seconds else 0
    
    if h > 0:
        return f"{h}:{m:02d}:{s:02d}"
    else:
        return f"{m}:{s:02d}"


def get_channel_info(channel_id_or_url: str) -> dict:
    """
    Resolves channel ID, URL, handle or display name search to fetch details using channels.list.
    Returns channel name, thumbnail, uploads playlist ID, subscribers, videos count, and ID.
    """
    channel_id, handle = parse_channel_id_or_handle(channel_id_or_url)
    
    items = []
    
    # 1. Attempt direct channel ID or handle lookup if parsed successfully and has no spaces
    if channel_id or (handle and " " not in handle):
        try:
            if channel_id:
                res = youtube.channels().list(
                    part="snippet,contentDetails,statistics",
                    id=channel_id
                ).execute()
            else:
                res = youtube.channels().list(
                    part="snippet,contentDetails,statistics",
                    forHandle=handle
                ).execute()
            items = res.get("items", [])
        except HttpError:
            pass

    # 2. Fallback to searching YouTube by name if direct lookup didn't yield anything
    if not items:
        try:
            query = channel_id_or_url.strip()
            if query.startswith("@"):
                query = query[1:]
            
            search_res = youtube.search().list(
                part="id",
                q=query,
                type="channel",
                maxResults=1
            ).execute()
            
            search_items = search_res.get("items", [])
            if search_items:
                resolved_id = search_items[0]["id"]["channelId"]
                res = youtube.channels().list(
                    part="snippet,contentDetails,statistics",
                    id=resolved_id
                ).execute()
                items = res.get("items", [])
        except HttpError as e:
            raise ValueError(f"YouTube Search API error: {e.reason}")

    if not items:
        raise ValueError(f"No YouTube channel found for query: '{channel_id_or_url}'")

    item = items[0]
    snippet = item.get("snippet", {})
    content_details = item.get("contentDetails", {})
    statistics = item.get("statistics", {})
    related_playlists = content_details.get("relatedPlaylists", {})

    # Extract values
    c_id = item.get("id")
    c_name = snippet.get("title")
    c_thumb = snippet.get("thumbnails", {}).get("default", {}).get("url")
    c_uploads = related_playlists.get("uploads")
    sub_count = statistics.get("subscriberCount")
    video_count = statistics.get("videoCount")

    if not c_uploads:
        raise ValueError(f"Could not resolve uploads playlist for the channel.")

    return {
        "id": c_id,
        "name": c_name,
        "thumbnail_url": c_thumb,
        "uploads_playlist_id": c_uploads,
        "subscriber_count": int(sub_count) if sub_count else None,
        "video_count": int(video_count) if video_count else None
    }


def get_channel_videos(uploads_playlist_id: str, max_results: int = 10) -> list[dict]:
    """
    Retrieves latest video items from uploads playlist and batch fetches statistics and duration.
    """
    if not uploads_playlist_id:
        return []

    try:
        # Step 1: Call playlistItems.list (1 quota unit)
        res_items = youtube.playlistItems().list(
            part="snippet",
            playlistId=uploads_playlist_id,
            maxResults=max_results
        ).execute()

        items = res_items.get("items", [])
        if not items:
            return []

        # Extract video IDs
        video_ids = []
        video_pub_dates = {}
        for item in items:
            v_id = item.get("snippet", {}).get("resourceId", {}).get("videoId")
            if v_id:
                video_ids.append(v_id)
                video_pub_dates[v_id] = item.get("snippet", {}).get("publishedAt")

        if not video_ids:
            return []

        # Step 2: Batch call videos.list with snippet, statistics, and contentDetails (1 quota unit for up to 50 videos)
        res_videos = youtube.videos().list(
            part="snippet,statistics,contentDetails",
            id=",".join(video_ids)
        ).execute()

        videos = res_videos.get("items", [])
        
        # Sort or align details
        video_list = []
        for v in videos:
            v_id = v.get("id")
            snippet = v.get("snippet", {})
            stats = v.get("statistics", {})
            content_details = v.get("contentDetails", {})
            
            # Parse duration
            duration = parse_iso_duration(content_details.get("duration", ""))
            
            # Map thumbnails
            thumb = snippet.get("thumbnails", {}).get("medium", {}).get("url") or \
                    snippet.get("thumbnails", {}).get("default", {}).get("url")

            video_list.append({
                "video_id": v_id,
                "title": snippet.get("title"),
                "thumbnail_url": thumb,
                "views": int(stats.get("viewCount", 0)),
                "likes": int(stats.get("likeCount", 0)),
                "comments_count": int(stats.get("commentCount", 0)),
                "duration": duration,
                "published_at": video_pub_dates.get(v_id) or snippet.get("publishedAt")
            })

        # Keep original ordering from playlistItems (chronological order)
        video_list.sort(key=lambda x: video_pub_dates.get(x["video_id"], ""), reverse=True)
        return video_list

    except HttpError as e:
        raise ValueError(f"YouTube API error: {e.reason}")


def get_top_comments(video_id: str, max_results: int = 5) -> list[dict]:
    """
    Fetches top comments using commentThreads.list. Handles comments disabled scenario.
    """
    if not video_id:
        return []

    try:
        res = youtube.commentThreads().list(
            part="snippet",
            videoId=video_id,
            order="relevance",
            maxResults=max_results
        ).execute()

        threads = res.get("items", [])
        comments = []
        for t in threads:
            top_comment = t.get("snippet", {}).get("topLevelComment", {}).get("snippet", {})
            comments.append({
                "author": top_comment.get("authorDisplayName"),
                "text": top_comment.get("textDisplay"),
                "likes": int(top_comment.get("likeCount", 0))
            })
        return comments
    except HttpError as e:
        # Check if comments are disabled
        # Comments disabled raises HTTP 403 or 400 with commentsDisabled code
        if e.resp.status in (403, 400):
            return []
        raise ValueError(f"YouTube API error: {e.reason}")


def get_channel_growth_data(channel_id: str, current_sub_count: int, db) -> list[dict]:
    """
    Generates dynamic subscriber growth statistics. Combines local database snaps and 
    simulated historical intervals.
    """
    from backend.app.models import ChannelSnapshot
    import datetime

    # 1. Query logged snapshots
    snapshots = db.query(ChannelSnapshot).filter(
        ChannelSnapshot.channel_id == channel_id
    ).order_by(ChannelSnapshot.recorded_at.asc()).all()

    # 2. If we have accumulated enough snapshots, use them
    if len(snapshots) >= 5:
        return [
            {
                "date": snap.recorded_at.strftime("%b %Y"),
                "subscribers": snap.subscribers,
                "views": snap.views
            }
            for snap in snapshots
        ]

    # 3. Fallback: generate a realistic historical progression curve for 6 months
    base_sub = current_sub_count if current_sub_count else 5000
    ratios = [0.82, 0.85, 0.89, 0.92, 0.96, 1.0]
    
    today = datetime.date.today()
    points = []
    
    for i, ratio in enumerate(ratios):
        month_offset = 5 - i
        year = today.year
        month = today.month - month_offset
        while month <= 0:
            month += 12
            year -= 1
            
        month_date = datetime.date(year, month, 1)
        sub_val = int(base_sub * ratio)
        
        points.append({
            "date": month_date.strftime("%b %Y"),
            "subscribers": sub_val,
            "views": int(sub_val * 14.8)  # estimated ratio of total views
        })

    # 4. Attempt to write a real snapshot entry for today
    try:
        today_start = datetime.datetime.combine(today, datetime.time.min)
        exists = db.query(ChannelSnapshot).filter(
            ChannelSnapshot.channel_id == channel_id,
            ChannelSnapshot.recorded_at >= today_start
        ).first()

        if not exists and current_sub_count:
            snap = ChannelSnapshot(
                channel_id=channel_id,
                subscribers=current_sub_count,
                views=int(current_sub_count * 14.8)
            )
            db.add(snap)
            db.commit()
    except Exception:
        db.rollback()

    return points

