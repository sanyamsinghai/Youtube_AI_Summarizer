# 📖 Recap Developer Cookbook

This document is a technical reference guide explaining exactly how the core algorithms and systems in Recap are coded and how to customize them.

---

## 🔄 1. The Rate-Limiting Auto-Retry Logic

Inside [summarizer.py](file:///c:/Users/Asus/Desktop/YouTube_Video_%20Summarizer/backend/app/services/summarizer.py), the `summarize_chunk` function wraps all Groq API calls in a retry block to manage temporary rate limits (TPM) gracefully.

* **Exponential Backoff:** If the Groq client throws a `RateLimitError` (HTTP 429), the code tries to parse Groq's `retry-after` header to see how long it should sleep. If not found, it falls back to parsing the error message using regular expressions:
  ```python
  match = re.search(r"try again in ([\d\.]+)s", str(e), re.IGNORECASE)
  ```
* **Daily Quota Cutoff:** If the parsed `retry_after` duration is **greater than 20 seconds**, the script immediately raises `ServiceUnavailableError` and fails. This prevents the API thread from sleeping for minutes or hours (which blocks the HTTP connection and causes a timeout).

---

## 💾 2. The Resilient Chunk Cache

When a long video transcript is chunked, each chunk's summary is persisted to the database immediately upon creation.

* **Saving Chunks:**
  ```python
  part = PartialSummary(
      video_id=video_id,
      style=style,
      chunk_index=i,
      summary_text=summary
  )
  db.add(part)
  db.commit()
  ```
* **Resuming:** Before processing any chunk, the code filters existing summaries by `video_id` and `style`. Chunks that already have a summary are skipped, saving both token usage and execution time.
* **Cleanup:** When the final combination round completes successfully:
  ```python
  db.query(PartialSummary).filter(
      PartialSummary.video_id == video_id,
      PartialSummary.style == style
  ).delete()
  db.commit()
  ```

---

## 💬 3. How the AI Chat Widget Works

The chat widget allows users to ask questions about the video transcript.

* **In-Memory Cache:** During the summarization pipeline, the raw text transcript of the video is saved in a fast in-memory cache:
  ```python
  transcript_cache.set(video_id, transcript)
  ```
* **Context Ingestion:** When a user opens the chat panel, the frontend calls the backend `/chat` endpoint. The backend pulls the transcript from `transcript_cache`, injects it as context alongside the user's question, and queries Groq:
  ```python
  system_prompt = "You are a helpful assistant. Use this transcript to answer questions accurately..."
  # completions.create with system_prompt (containing transcript) + user_message
  ```

---

## ✉️ 4. Markdown-to-HTML Email Formatting

Inside [email_sender.py](file:///c:/Users/Asus/Desktop/YouTube_Video_%20Summarizer/backend/app/services/email_sender.py), the raw markdown summary is parsed into elegant, styled HTML email blocks.

* **Parsing Logic:**
  * Headers (`## Header`) are styled as clean, dark titles (`<h2>` with borders).
  * Bullet items (`* item` or `- item`) are nested inside standard `<ul>` lists with line-height adjustments.
  * Paragraphs are parsed into standard `<p>` elements.
  * Inline bold markdown (`**text**`) is converted to styled `<strong>` tags:
    ```python
    re.sub(r'\*\*(.*?)\*\*', r'<strong style="color:#0f172a;">\1</strong>', escaped)
    ```
* **Color Themes:** The template automatically adjusts its colors (badges and accents) depending on the selected summary style (e.g. green accents for executive briefs, purple for student notes).
