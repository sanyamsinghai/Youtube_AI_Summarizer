from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import bootstrap  # noqa: F401

from backend.app.database import get_db
from backend.app.models import Channel
from backend.app.schemas.requests import SubscribeChannelRequest
from backend.app.services.youtube_channels import (
    get_channel_info,
    get_channel_videos,
    get_top_comments,
    get_channel_growth_data
)

router = APIRouter()

@router.post("/channels/subscribe")
def subscribe_channel(request: SubscribeChannelRequest, db: Session = Depends(get_db)):
    try:
        # 1. Resolve channel info via API
        channel_info = get_channel_info(request.channel_url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    # 2. Check if already subscribed
    channel_id = channel_info["id"]
    existing_channel = db.query(Channel).filter(Channel.id == channel_id).first()

    if existing_channel:
        # Update details in case they changed
        existing_channel.name = channel_info["name"]
        existing_channel.thumbnail_url = channel_info["thumbnail_url"]
        existing_channel.uploads_playlist_id = channel_info["uploads_playlist_id"]
        existing_channel.subscriber_count = channel_info["subscriber_count"]
        existing_channel.video_count = channel_info["video_count"]
        db.commit()
        db.refresh(existing_channel)
        return existing_channel

    # 3. Add new subscription
    new_channel = Channel(
        id=channel_id,
        name=channel_info["name"],
        thumbnail_url=channel_info["thumbnail_url"],
        uploads_playlist_id=channel_info["uploads_playlist_id"],
        subscriber_count=channel_info["subscriber_count"],
        video_count=channel_info["video_count"]
    )
    db.add(new_channel)
    db.commit()
    db.refresh(new_channel)
    return new_channel


@router.get("/channels")
def list_channels(db: Session = Depends(get_db)):
    channels = db.query(Channel).order_by(Channel.subscribed_at.desc()).all()
    return channels


@router.delete("/channels/{channel_id}")
def unsubscribe_channel(channel_id: str, db: Session = Depends(get_db)):
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found in subscriptions.")

    db.delete(channel)
    db.commit()
    return {"success": True, "message": f"Successfully unsubscribed from {channel.name}."}


@router.get("/channels/{channel_id}/videos")
def get_subscribed_channel_videos(channel_id: str, db: Session = Depends(get_db)):
    # 1. Find channel in DB to get uploads playlist ID
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel is not subscribed.")

    try:
        # 2. Call API to get videos using uploads playlist ID
        videos = get_channel_videos(channel.uploads_playlist_id)
        return videos
    except ValueError as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/videos/{video_id}/comments")
def get_video_top_comments(video_id: str):
    try:
        comments = get_top_comments(video_id)
        return comments
    except ValueError as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/channels/{channel_id}/growth")
def get_subscribed_channel_growth(channel_id: str, db: Session = Depends(get_db)):
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel is not subscribed.")

    try:
        growth_data = get_channel_growth_data(channel.id, channel.subscriber_count, db)
        return growth_data
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/channels/lookup")
def lookup_channel(url: str):
    try:
        info = get_channel_info(url)
        return info
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/channels/videos-by-playlist")
def get_videos_by_playlist(playlist_id: str):
    try:
        videos = get_channel_videos(playlist_id)
        return videos
    except ValueError as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/channels/growth-by-info")
def get_growth_by_info(channel_id: str, subscriber_count: int, db: Session = Depends(get_db)):
    try:
        growth_data = get_channel_growth_data(channel_id, subscriber_count, db)
        return growth_data
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


