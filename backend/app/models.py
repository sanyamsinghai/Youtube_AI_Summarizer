from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, ForeignKey, UniqueConstraint
from backend.app.database import Base

class Channel(Base):
    __tablename__ = "channels"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, primary_key=True, default="guest", index=True)  # Scopes subscription to user
    name = Column(String, nullable=False)
    thumbnail_url = Column(String, nullable=True)
    uploads_playlist_id = Column(String, nullable=False)
    subscriber_count = Column(Integer, nullable=True)
    video_count = Column(Integer, nullable=True)
    subscribed_at = Column(DateTime, default=datetime.utcnow)


class ChannelSnapshot(Base):
    __tablename__ = "channel_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    channel_id = Column(String, nullable=False, index=True)
    subscribers = Column(Integer, nullable=False)
    views = Column(Integer, nullable=False)
    recorded_at = Column(DateTime, default=datetime.utcnow)


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)  # Holds Google's 'sub' claim
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=True)


class Summary(Base):
    __tablename__ = "summaries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    video_id = Column(String, nullable=False)
    title = Column(String, nullable=False)
    summary_content = Column(String, nullable=False)  # Stores JSON serialized list/text
    style = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class PartialSummary(Base):
    __tablename__ = "partial_summaries"
    __table_args__ = (
        UniqueConstraint("video_id", "style", "chunk_index", name="uq_video_style_chunk"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    video_id = Column(String, nullable=False, index=True)
    style = Column(String, nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    summary_text = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)





