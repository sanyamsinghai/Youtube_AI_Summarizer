from fastapi import APIRouter

import bootstrap  # noqa: F401

from backend.app.core.prompts import STYLES
from backend.app.schemas.requests import summarize_request
from backend.app.services.email_sender import send_email
from backend.app.services.email_validation import validate_recipient_email
from backend.app.services.extractor import get_channel_id
from backend.app.services.extractor import get_video_title
from backend.app.services.summarizer import summarize_transcript
from backend.app.services.transcript_fetcher import get_transcript
from backend.app.services.video_data import get_response, filter_video_data

router = APIRouter()


@router.post("/summarize")
def summarize_video(request: summarize_request):

    channel_id = get_channel_id(request.channel_url)
    style = request.style
    if channel_id is None:
        return {"error": "Invalid Channel URL"}

    if style in STYLES:
        response = filter_video_data(get_response(channel_id))
        if response is None:
            return {"error": "No videos found for this channel."}

        video = response[0]
        video_id = video.get("videoId")
        transcript = get_transcript(video_id)

        if transcript is None:
            return {"error": "Transcript not available for this video."}

        summary = summarize_transcript(transcript, style)

        is_valid, email_or_message = validate_recipient_email(request.email)
        if not is_valid:
            return {
                "error": {
                    "message": "Invalid email address.",
                    "detail": email_or_message,
                    "field": "email",
                }
            }

        recipient_email = email_or_message

        email_success, email_result = send_email(recipient_email, summary, title=video.get("title") or get_video_title(video_id), style=style)
        if not email_success:
            return {
                "error": {
                    "message": "Failed to send email.",
                    "detail": email_result,
                    "field": "email",
                }
            }

        summary_record = {
            "channel_url": request.channel_url,
            "video_title": video.get("title"),
            "summary": summary,
            "email_sent_to": recipient_email
        }

        return summary_record

    else:
        return {
            "error": {
                "message": "Invalid style.",
                "detail": "Choose one of the supported summary styles.",
                "field": "style",
            }
        }


@router.get("/videos")
def get_videos(channel_url: str):
    channel_id = get_channel_id(channel_url)
    if channel_id is None:
        return {"error": "Invalid Channel URL"}

    response = filter_video_data(get_response(channel_id))
    if response is None:
        return {"error": "No videos found for this channel."}

    return response
