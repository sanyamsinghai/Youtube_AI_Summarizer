from fastapi import APIRouter, HTTPException, Depends

import bootstrap  # noqa: F401

from backend.app.core.prompts import STYLES
from backend.app.schemas.requests import SendEmailRequest, SummarizeVideoRequest, summarize_request
from backend.app.services.email_sender import send_email
from backend.app.services.email_validation import validate_recipient_email
from backend.app.services.extractor import extract_video_id, get_channel_id, get_video_title
from backend.app.services.summarizer import summarize_transcript, ServiceUnavailableError
from backend.app.services.transcript_fetcher import get_transcript
from backend.app.services.video_data import get_response, filter_video_data

from backend.app.services.pipeline import run_summary_pipeline
from backend.app.core.rate_limiter import summarize_limiter, email_limiter

router = APIRouter()


@router.post("/summarize", dependencies=[Depends(summarize_limiter)])
def summarize_video(request: SummarizeVideoRequest):
    try:
        return run_summary_pipeline(request.url, request.style)
    except ServiceUnavailableError:
        raise HTTPException(
            status_code=429,
            detail="We're experiencing high demand right now. Please wait a minute and try again.",
        )
    except ValueError as exc:
        msg = str(exc)
        if "Invalid style" in msg or "Invalid YouTube video URL" in msg or "valid YouTube link" in msg:
            raise HTTPException(status_code=400, detail=msg)
        elif "Transcript not available" in msg or "captions available" in msg:
            raise HTTPException(status_code=404, detail=msg)
        else:
            raise HTTPException(status_code=500, detail=msg)


@router.post("/email/send", dependencies=[Depends(email_limiter)])
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
