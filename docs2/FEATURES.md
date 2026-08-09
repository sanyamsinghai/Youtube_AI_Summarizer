# Features

What Recap actually does, from a user's perspective — and the reasoning behind each feature's design.

---

## 1. Paste a link, get a summary

The core flow: paste any YouTube video URL, pick a style, get a readable summary back. No login required — this works fully anonymously (see the "guest" fallback in [ARCHITECTURE.md](./ARCHITECTURE.md#4-authentication-how-login-actually-works)), because requiring an account before letting someone try the core feature is a common source of drop-off; letting people try it first and log in later (to save history) removes that friction.

## 2. Summary styles

The backend actually supports more styles than a simple 5-option list — `core/prompts.py` defines these distinct styles, each with its own system prompt tuned for that output shape:

| Style key | What it produces |
|---|---|
| `bullets` | Quick-scan bullet points |
| `brief` | Executive brief — professional, dense, to-the-point |
| `student_notes` | Structured notes, headers and sub-points, exam-prep style |
| `narrative` | Story-format recap, prose rather than fragments |
| `action_items` | Task-focused: what to actually go *do* after watching |
| `cheatsheet` | Condensed reference sheet |
| `eli5` | Explain-like-I'm-5 — simplified, jargon stripped out |

A few aliases (`bullet` → `bullets`, `action` → `action_items`, `student` → `student_notes`) also map to the same styles — these exist so slightly different naming used at different points in frontend development doesn't break requests; they all resolve to the same prompt underneath.

**Why per-style system prompts instead of one prompt with a "make it more X" instruction bolted on?** A single shared prompt with a style adjective tends to produce summaries that are subtly the same shape with different word choice. Giving each style its own dedicated system prompt — with its own structure instructions — produces genuinely different *output shapes*, not just different tone.

## 3. Google Sign-In

Optional login via Google OAuth. Logging in unlocks:
- **Saved summary history** (anonymous "guest" summaries are never written to permanent storage — see the `user_id != "guest"` check in the `/summarize` route)
- **Channel subscriptions** (tied to a `user_id`, so anonymous users can't build a persistent subscription list — there'd be no way to bring it back on a return visit without an account to anchor it to)

See [ARCHITECTURE.md](./ARCHITECTURE.md#4-authentication-how-login-actually-works) for exactly how the OAuth handshake works.

## 4. Chat with the video

After a summary is generated, a chat widget lets you ask follow-up questions about the video's actual content. This works by:

1. Caching the full transcript in memory (not the DB) the moment a summary finishes, keyed by `video_id`, for 1 hour.
2. On each chat message, pulling that cached transcript (capped at 12,000 characters) into the system prompt, along with up to the last 10 turns of conversation history sent from the frontend.
3. Sending all of it to the 70B model for a grounded, transcript-aware answer.

**Why cache the transcript instead of re-fetching it per chat message?** Re-fetching would mean an extra transcript API call (with all the IP-blocking risk described in [IP_WORKAROUNDS.md](./IP_WORKAROUNDS.md)) on every single chat message — expensive and slow for no benefit, since the transcript doesn't change.

**Why an in-memory cache instead of the database?** The transcript is only needed for the lifetime of an active chat session, not permanently. A 1-hour TTL means memory usage doesn't grow unbounded as more videos get chatted about over time — old entries just expire and get garbage collected. The tradeoff: if the server restarts, or a user comes back after an hour, the cache is gone and they'll be told to re-summarize before chatting again. That's an acceptable tradeoff for a portfolio project; a production app with real usage might back this with Redis instead, so the cache survives restarts and works across multiple server instances.

## 5. Email delivery

The Share button can send the summary to any email address via Resend. The email isn't just the raw AI text — `email_sender.py` parses the summary's lightweight markdown (`##` headers, bullet/numbered lists, `**bold**`) and renders it into a fully styled HTML email, with a color-coded badge per style (e.g. blue for Bullet Points, green for Executive Brief).

**Why hand-roll markdown parsing instead of using a library like `markdown2` or `mistune`?** The summaries only ever contain a small, predictable subset of markdown (headers, lists, bold) — the model is prompted to produce exactly that. A ~100-line hand-rolled parser handling just those cases is simpler to reason about and has zero extra dependencies, versus pulling in a general-purpose markdown library that handles tables, code blocks, images, and dozens of edge cases this app will never produce.

WhatsApp delivery is visually present in the Share menu but intentionally disabled ("Coming soon") — it's pending access to a WhatsApp API (CallMeBot), not something faked to look functional. Per the project's own rule, deferred features aren't presented as working.

## 6. Channel subscriptions

Subscribe to a YouTube channel (by URL) to see its recent uploads and top comments, without needing to re-search for it each time. Channel data (`Channel` model) is scoped per-user via a composite `(id, user_id)` key, so two different logged-in users can independently subscribe to the same channel.

Quota efficiency matters here: fetching this data uses `channels.list` + `playlistItems.list` + batched `videos.list` calls (1 quota unit each on the YouTube Data API), deliberately avoiding `search.list`, which costs 100 units per call — a single search-based lookup would burn as much quota as 100 direct lookups.

### Channel growth tracking — known limitation

There's a `/channels/{id}/growth` endpoint intended to chart subscriber/view growth over time, backed by a `channel_snapshots` table that records one data point per channel per day.

**Current known issue:** because a new subscription starts with zero snapshots, `get_channel_growth_data()` doesn't yet have real historical data to show for the first several days. Right now, when fewer than 5 real snapshots exist, the function falls back to **generating an estimated 6-month curve** based on the channel's current subscriber count, rather than showing "not enough data yet." This is not real historical data and should not be treated as a finished, portfolio-ready feature as currently implemented — it's flagged here as a known limitation, to be replaced with an honest "gathering data" state rather than a fabricated trend line.

## 7. History

Logged-in users can view a history of every summary they've generated (`HistoryPage.jsx` + the `summaries` table), letting them revisit a past summary without re-running the pipeline.
