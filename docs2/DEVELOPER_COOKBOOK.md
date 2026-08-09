# Developer Cookbook

Practical, code-level walkthroughs of the trickier pieces of this codebase — the parts where reading the function signature alone wouldn't tell you what's really going on. For the high-level "why this architecture" reasoning, see [ARCHITECTURE.md](./ARCHITECTURE.md) and [AI_PIPELINE.md](./AI_PIPELINE.md) — this file is about *how the code actually does it*.

---

## 1. Transcript fetching: dealing with two different kinds of failure

`get_transcript()` in `transcript_fetcher.py` has to handle two YouTube-specific quirks that aren't obvious from a first read:

**Quirk 1 — the library's own default is a trap.** `youtube_transcript_api`'s `.fetch()` method, even with *no* language argument, silently defaults to requesting English (`en`) only. So it can't be used as a generic "give me whatever caption track exists" call — a video captioned only in Hindi or Spanish would incorrectly raise `NoTranscriptFound`. The fix: catch that specific exception, then fall back to `.list()`, which returns *every* available transcript track for that video regardless of language, and take the first one:

```python
try:
    transcript = api.fetch(video_id, languages=["en"])
except NoTranscriptFound:
    available = api.list(video_id)
    first_available = next(iter(available))
    transcript = first_available.fetch()
```

**Quirk 2 — not all failures are equal.** The retry loop checks the *error message text* to decide how to react:
- `"blocking requests"` / `"IPBlocked"` / `"RequestBlocked"` → YouTube is rate-limiting this server's IP (see [IP_WORKAROUNDS.md](./IP_WORKAROUNDS.md)). Worth retrying after a delay.
- `"Subtitles are disabled"` → this video simply has no captions, ever. Retrying won't help — return `None` immediately instead of wasting 2 more attempts.
- Anything else → an unexpected error; retry anyway, but log it clearly for debugging.

**Why check the error message string instead of catching more specific exception types?** The underlying library doesn't always expose distinct exception classes for every one of these cases — some just come through as a generic exception with a descriptive message. Message-matching is a pragmatic workaround, with the tradeoff that it's fragile if the library ever changes its wording (worth knowing if this code ever mysteriously "stops working" after a library upgrade — check whether the error message text changed first).

---

## 2. The email HTML renderer's list-buffering trick

`format_summary_html()` in `email_sender.py` converts line-by-line markdown into HTML, and the trickiest part is handling **consecutive list items as one `<ul>`/`<ol>` block**, not one tag per line.

It keeps a small buffer (`current_list_type`, `current_list_items`) as it walks through lines. Every bullet or numbered line gets appended to the buffer instead of emitted immediately. The buffer only gets flushed into a real `<ul>...</ul>` (via `close_list()`) when:
- a blank line is hit, or
- the list type switches (bullets to numbers, or vice versa), or
- a header or plain paragraph line appears, or
- the input ends

**Why not just wrap every single list line in its own `<ul><li>...</li></ul>`?** That would render as five separate bulleted boxes instead of one clean list with five bullet points — visually broken in an email client. Buffering and closing only at a real boundary produces one contiguous list per markdown list block, matching what the user would expect from reading the original bullet points.

---

## 3. Rate limiter: how `Depends(summarize_limiter)` actually blocks a request

Routes reference the limiter like this:

```python
@router.post("/summarize", dependencies=[Depends(summarize_limiter)])
def summarize_video(...):
```

FastAPI's `Depends()` runs the given callable *before* the route function body executes, and if that callable raises an exception, the route body never runs at all — the client gets the limiter's error response instead. This is why the limiter doesn't need to be called manually inside `summarize_video()` — declaring it as a dependency is enough to gate every request to this endpoint through it first.

---

## 4. Why `bootstrap.py` gets imported (and never used) everywhere

You'll see `import bootstrap  # noqa: F401` at the top of several route files, immediately flagged `noqa` (meaning: "linter, don't warn me that this import looks unused").

`bootstrap.py`'s entire job is a side effect — inserting the project root onto `sys.path` the moment it's imported:

```python
ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))
```

This lets files inside `backend/app/` use absolute imports like `from backend.app.database import get_db` regardless of which directory the script was actually launched from. Without it, running a file directly (rather than via `uvicorn` from the project root) could fail with `ModuleNotFoundError`, since Python wouldn't otherwise know where the project root is relative to that file.

**Why not just always launch everything from the project root and skip this entirely?** Because this project genuinely gets launched multiple different ways — `uvicorn` from the root, the interactive `main.py` launcher menu, individual scripts run directly during debugging — and `bootstrap.py` makes absolute imports work correctly no matter which entry point was used, rather than requiring every future script to remember the right working directory.

---

## 5. Chat widget: message history is stateless on the backend

`ChatRequest` accepts a `history: list[ChatMessage]` field sent fresh **from the frontend** on every single chat call — the backend itself doesn't store conversation turns anywhere.

**Why make the frontend responsible for remembering the conversation, instead of the backend keeping a session-based chat log?** The backend already has one piece of state to manage for chat (the cached transcript, TTL'd in `transcript_cache.py`). Adding a second piece of server-side state (conversation history, keyed per video *and* per user) would mean more to keep consistent and more that can go stale or leak between sessions. Since the frontend already has the full conversation in its own component state to render the chat bubbles on screen, resending it costs nothing extra and keeps the backend simpler — each `/chat` call is a complete, independent request with everything it needs, rather than relying on server memory of "what happened before."

---

## 6. Recognizing a stray `/summarize/channel` or `/videos` endpoint

`routes/summary.py` includes `POST /summarize/channel` and `GET /videos`, explicitly commented as `# Backwards-compatible ... (not used by current frontend)`. If you're debugging and stumble on these, they aren't dead code by accident — they're kept for compatibility with an older frontend flow, not wired into the current UI. Worth confirming with a quick `grep` in `frontend/src` before assuming any route is actually reachable from the app you're testing.
