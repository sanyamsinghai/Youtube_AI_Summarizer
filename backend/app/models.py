from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, ForeignKey
from backend.app.database import Base

class Channel(Base):
    __tablename__ = "channels"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    thumbnail_url = Column(String, nullable=True)
    uploads_playlist_id = Column(String, nullable=False)
    subscriber_count = Column(Integer, nullable=True)
    video_count = Column(Integer, nullable=True)
    subscribed_at = Column(DateTime, default=datetime.utcnow)


class ChannelSnapshot(Base):
    __tablename__ = "channel_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    channel_id = Column(String, ForeignKey("channels.id"), nullable=False)
    subscribers = Column(Integer, nullable=False)
    views = Column(Integer, nullable=False)
    recorded_at = Column(DateTime, default=datetime.utcnow)

