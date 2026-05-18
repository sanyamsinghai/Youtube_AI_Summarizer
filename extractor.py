from urllib.parse import urlparse, parse_qs

def extract_video_id(url):

    video_id = None

    if "youtu.be" in url:
        path = urlparse(url).path
        video_id = path.split("/")[-1]
        
    elif "youtube.com" in url:
        if "/embed/" in url:
            path = urlparse(url).path
            video_id = path.split("/")[-1]
            
        else:
            query = urlparse(url).query
            video_id = parse_qs(query).get("v", [None])[0]

    return video_id
    
def get_channel_id(url):
    channel_id = None

    try:
        if "youtube.com/channel/" in url:
            path = urlparse(url).path
            channel_id = path.split("/")[-1]
    except IndexError:
        print("Invalid YouTube channel URL")
    return channel_id