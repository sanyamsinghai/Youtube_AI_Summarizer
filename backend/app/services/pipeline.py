import bootstrap  # noqa: F401
import os

from backend.app.core.prompts import STYLES
from backend.app.services.extractor import extract_video_id, get_video_title
from backend.app.services.transcript_fetcher import get_transcript
from backend.app.services.summarizer import summarize_transcript, ServiceUnavailableError
from backend.app.services.transcript_cache import transcript_cache


def run_summary_pipeline(url: str, style: str) -> dict:
    """
    Orchestrates the entire YouTube video summarization pipeline.

    Args:
        url: The YouTube video URL.
        style: The summary style template.

    Returns:
        dict: { "video_id": str, "title": str, "summary": str, "style": str }

    Raises:
        ValueError: If the style is unsupported, URL is invalid,
                    transcript is missing, or summarization fails.
    """
    if style not in STYLES:
        raise ValueError("That summary style isn't supported. Please select one from the list.")

    video_id = extract_video_id(url)
    if not video_id:
        raise ValueError("That doesn't look like a valid YouTube link. Please check the URL and try again.")

    # Fetch title BEFORE summarization so it can be injected into the prompt
    title = get_video_title(video_id)

    transcript = get_transcript(video_id)
    if transcript is None:
        raise ValueError("This video doesn't have captions available. Try a video with subtitles enabled.")

    # Feasibility check: enforce a word count limit to protect API quotas
    words = transcript.split()
    max_words = int(os.getenv("MAX_SUMMARY_WORDS", "30000"))
    if len(words) > max_words:
        limit_hours = round(max_words / 9000, 1)
        raise ValueError(f"This video is too long to summarize (maximum limit is {limit_hours} hours). Please try a shorter video.")

    # Cache transcript so /chat can use it later without re-fetching
    transcript_cache.set(video_id, transcript)

    # Pass title into summarizer for richer, more context-aware output
    summary = summarize_transcript(transcript, style, title=title, video_id=video_id)

    if summary is None:
        raise ValueError("Something went wrong while processing this video. Please try again in a moment.")

    return {
        "video_id": video_id,
        "title": title,
        "summary": summary,
        "style": style,
    }
