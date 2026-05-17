from urllib.parse import urlparse, parse_qs

def extract_video_id(url):
    if "youtu.be" in url:
        path = urlparse(url).path
        video_id = path.split("/")[-1]
        return video_id
    elif "youtube.com" in url:
        if "/embed/" in url:
            path = urlparse(url).path
            video_id = path.split("/")[1]
            return video_id
        else:
            query = urlparse(url).query
            video_id = parse_qs(query).get("v", [None])[0]
            return video_id
    else:
        return None
    
# def extract_video_id(url):
#     # result = urlparse(url)
#     # video_id = parse_qs(result.query).get("v", [None])[0]
#     # return video_id
#     try:
#         if "youtu.be" in url:
#             video_id=url.split("/")[-1]
#             if "?" in video_id:
#                 video_id = video_id.split("?")[0]
#             return video_id
#         elif "?v=" in url:
#             video_id = url.split("?v=")[1]
#             return video_id
#         elif "&v=" in url:
#             video_id = url.split("&v=")[1]
#             return video_id
#         elif "/embed/" in url:
#             video_id = url.split("/embed/")[1]
#             return video_id
#         else:
#             return None
#     except IndexError:
#         return None

# def extract_video_id(url):
#     try:
#         if "youtu.be" in url:
#             video_id = url.split("/")[-1]
#             return video_id.split("?")[0]
#         elif "?v=" in url:
#             first_split = url.split("?v=")[1]
#             video_id = first_split.split("&")[0]
#             return video_id
#         else:
#             return None
#     except IndexError:
#         return None

# # print(extract_video_id("https://www.youtube.com/watch?v=yNbnA5pryMg&t=458s"))
# # print(extract_video_id("https://www.youtube.com/watch?list=PLabc123"""))
# # print(extract_video_id("https://youtu.be/yNbnA5pryMg"))
# # print(extract_video_id("https://youtu.be/yNbnA5pryMg?t=50s"))
# print(extract_video_id("https://www.youtube.com/watch?v=gR56_0NTJNs"))