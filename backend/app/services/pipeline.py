import bootstrap  # noqa: F401

from backend.app.core.prompts import STYLES
from backend.app.services.extractor import extract_video_id, get_video_title
from backend.app.services.transcript_fetcher import get_transcript
from backend.app.services.summarizer import summarize_transcript
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
        raise ValueError("Invalid style. Choose one of the supported summary styles.")

    video_id = extract_video_id(url)
    if not video_id:
        raise ValueError("Invalid YouTube video URL.")

    # Fetch title BEFORE summarization so it can be injected into the prompt
    title = get_video_title(video_id)

    transcript = get_transcript(video_id)
    if transcript is None:
        raise ValueError("Transcript not available for this video.")

    # Cache transcript so /chat can use it later without re-fetching
    transcript_cache.set(video_id, transcript)

    # Pass title into summarizer for richer, more context-aware output
    summary = summarize_transcript(transcript, style, title=title)
    if summary is None:
        raise ValueError("Failed to generate summary.")

    return {
        "video_id": video_id,
        "title": title,
        "summary": summary,
        "style": style,
    }
