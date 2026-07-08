from fastapi import APIRouter, HTTPException

import bootstrap  # noqa: F401

from backend.app.core.prompts import STYLES
from backend.app.schemas.requests import SendEmailRequest, SummarizeVideoRequest, summarize_request
from backend.app.services.email_sender import send_email
from backend.app.services.email_validation import validate_recipient_email
from backend.app.services.extractor import extract_video_id, get_channel_id, get_video_title
from backend.app.services.summarizer import summarize_transcript
from backend.app.services.transcript_fetcher import get_transcript
from backend.app.services.video_data import get_response, filter_video_data

router = APIRouter()


@router.post("/summarize")
def summarize_video(request: SummarizeVideoRequest):
    style = request.style
    if style not in STYLES:
        raise HTTPException(
            status_code=400,
            detail="Invalid style. Choose one of the supported summary styles.",
        )

    video_id = extract_video_id(request.url)
    if not video_id:
        raise HTTPException(status_code=400, detail="Invalid YouTube video URL.")

    transcript = get_transcript(video_id)
    if transcript is None:
        raise HTTPException(status_code=404, detail="Transcript not available for this video.")

    summary = summarize_transcript(transcript, style)
    if summary is None:
        raise HTTPException(status_code=500, detail="Failed to generate summary.")

    title = get_video_title(video_id)

    return {
        "video_id": video_id,
        "title": title,
        "summary": summary,
        "style": style,
    }

@router.post("/email/send")
def email_send(request: SendEmailRequest):
    is_valid, email_or_message = validate_recipient_email(request.email)
    if not is_valid:
        return {"success": False, "reason": email_or_message}

    recipient_email = email_or_message
    email_success, email_result = send_email(
        recipient_email,
        request.summary,
        title=request.title,
        style=request.style,
    )
    if not email_success:
        return {"success": False, "reason": email_result}

    return {"success": True}


# Backwards-compatible channel-based endpoints (not used by current frontend).
@router.post("/summarize/channel")
def summarize_latest_channel_video(request: summarize_request):
    channel_id = get_channel_id(request.channel_url)
    style = request.style
    if channel_id is None:
        raise HTTPException(status_code=400, detail="Invalid Channel URL")

    if style not in STYLES:
        raise HTTPException(
            status_code=400,
            detail="Invalid style. Choose one of the supported summary styles.",
        )

    response = filter_video_data(get_response(channel_id))
    if response is None:
        raise HTTPException(status_code=404, detail="No videos found for this channel.")

    video = response[0]
    video_id = video.get("videoId")
    transcript = get_transcript(video_id)

    if transcript is None:
        raise HTTPException(status_code=404, detail="Transcript not available for this video.")

    summary = summarize_transcript(transcript, style)
    if summary is None:
        raise HTTPException(status_code=500, detail="Failed to generate summary.")

    is_valid, email_or_message = validate_recipient_email(request.email)
    if not is_valid:
        raise HTTPException(status_code=400, detail=email_or_message)

    recipient_email = email_or_message

    email_success, email_result = send_email(
        recipient_email,
        summary,
        title=video.get("title") or get_video_title(video_id),
        style=style,
    )
    if not email_success:
        raise HTTPException(status_code=502, detail=email_result)

    return {
        "channel_url": request.channel_url,
        "video_title": video.get("title"),
        "summary": summary,
        "email_sent_to": recipient_email,
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
