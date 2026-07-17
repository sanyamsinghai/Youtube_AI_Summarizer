"""
Simple in-memory transcript cache keyed by video_id.
Stores the raw transcript after summarization so the /chat
endpoint can use it without re-fetching.
Entries expire after TTL_SECONDS to avoid unbounded memory growth.
"""
import time
from typing import Optional

TTL_SECONDS = 60 * 60  # 1 hour


class TranscriptCache:
    def __init__(self):
        self._store: dict[str, dict] = {}

    def set(self, video_id: str, transcript: str):
        self._store[video_id] = {
            "transcript": transcript,
            "ts": time.time(),
        }

    def get(self, video_id: str) -> Optional[str]:
        entry = self._store.get(video_id)
        if not entry:
            return None
        if time.time() - entry["ts"] > TTL_SECONDS:
            del self._store[video_id]
            return None
        return entry["transcript"]


# Singleton used across the app
transcript_cache = TranscriptCache()
