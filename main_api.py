from fastapi import FastAPI
from pydantic import BaseModel

from extractor import get_channel_id
from prompts import STYLES
from video_data import get_response, filter_video_data
from transcript_fetcher import get_transcript
from summarizer import summarize_transcript
from email_sender import send_email

app = FastAPI()

class summarize_request(BaseModel):
    channel_url: str
    style: str
    email: str

@app.post("/summarize")
def summarize_video(request: summarize_request):
    
    channel_id = get_channel_id(request.channel_url)
    style = request.style
    if channel_id is None:
        return {"error": "Invalid Channel URL"}
    
    if style in STYLES:
        response = filter_video_data(get_response(channel_id))
        if response is None:
            return {"error": "No videos found for this channel."}
        
        video = response[0]  # Get the first video
        video_id = video.get("videoId")
        transcript = get_transcript(video_id)
        
        if transcript is None:
            return {"error": "Transcript not available for this video."}
        
        summary = summarize_transcript(transcript, style)
        
        email_result = send_email(request.email, summary)
        if not email_result:
            return {"error": "Failed to send email."}

        summary_record = {
            "channel_url": request.channel_url,
            "video_title": video.get("title"),
            "summary": summary,
            "email_sent_to": request.email
        }

        return summary_record

    else:
        return {"error": "Invalid style."}
    


@app.get("/videos")
def get_videos(channel_url:str):
    channel_id = get_channel_id(channel_url)
    if channel_id is None:
        return {"error": "Invalid Channel URL"}
    
    response = filter_video_data(get_response(channel_id))
    if response is None:
        return {"error": "No videos found for this channel."}
    
    return response


