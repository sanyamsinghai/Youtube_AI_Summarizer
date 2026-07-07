"""
Single Video Summarizer
Accepts a YouTube video URL, fetches transcript, summarizes, and saves.
Simple and fast - no batch processing, no rate-limiting issues.
"""

import sys
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import bootstrap  # noqa: F401

from backend.app.services.email_sender import send_email
from backend.app.services.email_validation import validate_recipient_email
from backend.app.services.extractor import extract_video_id
from backend.app.services.extractor import get_video_title
from backend.app.services.summarizer import summarize_transcript
from backend.app.services.transcript_fetcher import get_transcript


def summarize_single_video(video_url, style='bullet'):
    """
    Summarize a single YouTube video.
    
    Args:
        video_url: YouTube video URL (e.g., youtube.com/watch?v=... or youtu.be/...)
        style: Summary style (default: 'bullet')
    
    Returns:
        dict with summary data or None if failed
    """
    print(f"Processing video: {video_url}")
    
    # Step 1: Extract video ID from URL
    video_id = extract_video_id(video_url)
    if not video_id:
        print("❌ Failed to extract video ID from URL")
        return None
    print(f"✓ Video ID: {video_id}")

    video_title = get_video_title(video_id)
    
    # Step 2: Fetch transcript
    print("Fetching transcript...")
    transcript = get_transcript(video_id)
    if not transcript:
        print("❌ No transcript found for this video")
        return None
    print(f"✓ Transcript fetched ({len(transcript)} characters)")
    
    # Step 3: Summarize
    print(f"Summarizing with style: {style}...")
    summary = summarize_transcript(transcript, style)
    if not summary:
        print("❌ Failed to generate summary")
        return None
    print(f"✓ Summary generated ({len(summary)} characters)")
    
    # Step 4: Create summary record
    summary_record = {
        'sourceVideo': {
            'url': video_url,
            'videoId': video_id,
            'title': video_title,
        },
        'style': style,
        'summary': summary,
        'generatedAt': datetime.now(timezone.utc).isoformat()
    }
    
    return summary_record


def save_summary(summary_record, filename='data/summary_data.json'):
    """Save summary to JSON file, appending to existing data."""
    path = Path(filename)
    if not path.is_absolute():
        path = ROOT_DIR / path

    try:
        with path.open('r', encoding='utf-8') as f:
            existing = json.load(f)
            if isinstance(existing, list):
                existing.append(summary_record)
            else:
                existing = [existing, summary_record]
    except (FileNotFoundError, json.JSONDecodeError):
        existing = [summary_record]
    
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w', encoding='utf-8') as f:
        json.dump(existing, f, indent=4, ensure_ascii=False)
    
    return len(existing)


def prompt_email_delivery(summary_record):
    send_choice = input("Do you want to send this summary by email? (y/n): ").strip().lower()

    if send_choice not in ("y", "yes"):
        print("Skipping email delivery.")
        return

    while True:
        print("Enter a valid, non-temporary email address. Disposable or invalid addresses will be rejected.")
        recipient_email = input("Recipient email address (or press Enter to skip): ").strip()
        if not recipient_email:
            print("Skipping email delivery.")
            return

        is_valid, email_or_message = validate_recipient_email(recipient_email)
        if not is_valid:
            print(f"❌ Invalid email address: {email_or_message}")
            continue

        recipient_email = email_or_message

        print("Sending email...")
        email_success, email_result = send_email(
            recipient_email,
            summary_record["summary"],
            title=summary_record["sourceVideo"].get("title"),
            style=summary_record["style"],
        )
        if email_success:
            print(f"✓ Email sent to {recipient_email}")
            return

        print(f"❌ Failed to send email: {email_result}")
        print("Please enter a different email address and try again.")


if __name__ == '__main__':
    # Get video URL from user
    video_url = input("Enter YouTube video URL: ").strip()
    
    if not video_url:
        print("❌ No URL provided")
        exit(1)
    
    # Get summary style (optional)
    print("\nAvailable styles: bullet, student, narrative, action, cheatsheet, eli5, q&a, executive brief")
    style = input("Enter style (default: bullet): ").strip().lower() or 'bullet'
    
    # Summarize
    print("\n" + "="*50)
    summary_record = summarize_single_video(video_url, style)
    print("="*50 + "\n")
    
    if summary_record:
        # Save to JSON
        total = save_summary(summary_record)
        print(f"✓ Summary saved to data/summary_data.json (total: {total})")
        
        # Display summary
        print("\n--- SUMMARY ---\n")
        print(summary_record['summary'])

        # Optional email delivery
        prompt_email_delivery(summary_record)
    else:
        print("Failed to generate summary")
