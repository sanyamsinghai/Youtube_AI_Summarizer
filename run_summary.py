from video_data import get_response, filter_video_data
from transcript_fetcher import get_transcript
from summarizer import summarize_transcript
import json
from datetime import datetime, timezone

channel_id = 'UCyYSbZK13mgCdutpIyKJeng'
raw = get_response(channel_id)
videos = filter_video_data(raw)
summary_record = None
for video in videos:
    vid = video.get('videoId')
    t = get_transcript(vid)
    if t:
        s = summarize_transcript(t, 'bullet')
        summary_record = {
            'sourceVideo': {
                'channelTitle': video.get('channelTitle'),
                'channelId': video.get('channelId'),
                'title': video.get('title'),
                'publishedAt': video.get('publishedAt'),
                'videoId': video.get('videoId')
            },
            'style': 'bullet',
            'summary': s,
            'generatedAt': datetime.now(timezone.utc).isoformat()
        }
        break

if summary_record:
    try:
        with open('summary_data.json','r',encoding='utf-8') as f:
            existing = json.load(f)
            if isinstance(existing, list):
                existing.append(summary_record)
            else:
                existing = [existing, summary_record]
    except Exception:
        existing = [summary_record]
    with open('summary_data.json','w',encoding='utf-8') as f:
        json.dump(existing, f, indent=4, ensure_ascii=False)
    print('Saved summary for', summary_record['sourceVideo']['title'])
else:
    print('No transcript found to summarize')
