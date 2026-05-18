from transcript_fetcher import get_transcript
from extractor import get_channel_id
from video_data import get_response,filter_video_data,save_to_json

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
        for video in response:
            video_id = video.get("videoId")
            transcript = get_transcript(video_id)
            video["transcript"] = transcript
        save_to_json(response)
    else:
        print("no video data found for the channel")