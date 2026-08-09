# Architecture Guide

This document explains how Recap is put together: what each piece does, how they talk to each other, and — just as important — *why* it was built this way instead of some other way. If you've never worked with FastAPI, SQLAlchemy, or OAuth before, this is written so you can follow along without prior exposure to any of them.

---

## 1. The big picture

Recap is a **client-server web app**. That just means two separate programs exist — one runs in the user's browser (the frontend), one runs on a server somewhere (the backend) — and they only talk to each other over HTTP, by sending JSON back and forth. Neither program can directly read the other's code or memory; the only communication channel is network requests.

```
┌─────────────────┐         HTTP requests          ┌──────────────────┐
│  React Frontend  │ ─────── (JSON over HTTP) ────► │  FastAPI Backend │
│  (runs in your   │ ◄─────────────────────────────│  (runs on a      │
│   browser)       │                                 │   server)        │
└─────────────────┘                                 └────────┬─────────┘
                                                              │
                        ┌─────────────────────────────────────┼───────────────────────┐
                        │                                     │                       │
                        ▼                                     ▼                       ▼
                ┌───────────────┐                    ┌─────────────────┐    ┌──────────────────┐
                │ SQLite (app.db)│                    │   Groq Cloud API  │    │  YouTube Data API │
                │ users, summaries│                   │  (AI completions) │    │  + transcript lib  │
                │ channels, etc.  │                   └─────────────────┘    └──────────────────┘
                └───────────────┘                                                     │
                                                                                       ▼
                                                                               ┌─────────────────┐
                                                                               │   Resend (SMTP)   │
                                                                               │  email delivery    │
                                                                               └─────────────────┘
```

**Why split it this way at all?** You *could* build this as one program — a Python script with a UI baked in. The reason to separate frontend and backend is that they change for different reasons and at different speeds. You'll redesign the UI far more often than you change how summarization works, and keeping them separate means a UI change can't accidentally break the AI pipeline (and vice versa). It also means the backend can be reused by something other than this specific React app later — a mobile app, a CLI tool, anything that can send HTTP requests.

---

## 2. Where things live

```
YouTube_AI_Summarizer/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app setup: middleware, routers, CORS
│   │   ├── database.py       # SQLite connection + session factory
│   │   ├── models.py         # Table definitions (SQLAlchemy)
│   │   ├── auth_utils.py     # Reads the logged-in user_id from the session cookie
│   │   ├── core/
│   │   │   ├── prompts.py    # The system prompts for each summary style
│   │   │   └── rate_limiter.py  # Custom token-bucket limiter (no Redis needed)
│   │   ├── routes/           # One file per group of endpoints
│   │   │   ├── summary.py
│   │   │   ├── channels.py
│   │   │   ├── chat.py
│   │   │   └── auth.py
│   │   └── services/         # The actual business logic, called by routes
│   │       ├── summarizer.py       # Talks to Groq, runs map-reduce
│   │       ├── transcript_fetcher.py
│   │       ├── transcript_cache.py # In-memory cache for the chat feature
│   │       ├── email_sender.py     # Talks to Resend, builds HTML emails
│   │       └── youtube_channels.py # Talks to YouTube Data API
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Routing between pages
│   │   ├── api/client.js     # All fetch() calls to the backend live here
│   │   ├── components/       # Reusable pieces (ChatWidget, StyleSelector...)
│   │   └── pages/            # Full screens (SummarizerPage, HistoryPage...)
│   └── package.json
├── data/                     # app.db lives here at runtime (gitignored)
└── docs/                     # you are here
```

**Why routes/ and services/ are split up:** A route file's job is *only* to receive an HTTP request, validate it, and return a response. The actual logic (calling Groq, querying YouTube, formatting an email) lives in `services/`. This separation means the same summarization logic in `summarizer.py` could be called from a route, a CLI script, or a test — it doesn't know or care that HTTP is involved. Mixing the two (business logic directly inside route functions) is a common beginner pattern that works fine at small scale but gets painful to test and reuse as the app grows.

---

## 3. The tech stack, and why each piece was chosen

| Piece | What it is | Why this, not an alternative |
|---|---|---|
| **FastAPI** | Python web framework for building the backend API | Async by default, validates request data automatically via Pydantic, and generates interactive API docs for free. Chosen over Flask because Flask needs extra libraries bolted on to get the same validation and async support. |
| **SQLAlchemy + SQLite** | ORM (lets you write Python classes instead of raw SQL) + file-based database | SQLite needs no separate server process — the whole database is one file (`app.db`). That's ideal for a solo portfolio project and local development. **Tradeoff to know:** SQLite handles concurrent *writes* poorly — only one write can happen at a time. That's fine at hobby-project traffic levels, but a real production app with many simultaneous users would need to migrate to Postgres. SQLAlchemy is used specifically so that migration later mostly means changing the connection string, not rewriting every query. |
| **Groq Cloud API** | Runs the AI models (Llama 3.1 8B and 3.3 70B) | Chosen over OpenAI/Anthropic APIs because Groq's free tier is generous enough for a portfolio project, and its inference speed (it uses custom LPU hardware, not GPUs) makes summarization feel close to instant. The tradeoff is a stricter daily token quota on the best model, which is why the app uses two models instead of one (see [AI_PIPELINE.md](./AI_PIPELINE.md)). |
| **Session cookies (Starlette `SessionMiddleware`) + Authlib** | Login state stored server-side, referenced via a cookie | Chosen over JWTs (JSON Web Tokens) for simplicity: a session can be instantly invalidated by clearing server state (e.g. on logout), whereas a JWT stays valid until it expires no matter what the server does. The tradeoff is that sessions don't scale across multiple server instances without a shared store (like Redis) — fine for one server, a real constraint if this were ever deployed behind a load balancer. |
| **Resend** | Sends the summary emails | Chosen over raw SMTP or a paid provider like SendGrid because Resend has a workable free tier and a simple API, and it doesn't require managing your own mail server (which gets flagged as spam constantly if self-hosted). |
| **youtube-transcript-api + YouTube Data API v3** | Fetches transcripts and channel/video metadata | Transcript fetching is a separate, unofficial library because YouTube's official API does not expose caption text directly — only metadata. See [IP_WORKAROUNDS.md](./IP_WORKAROUNDS.md) for the practical limitation this creates. |

---

## 4. Authentication: how login actually works

Recap uses **Google OAuth 2.0**, implemented with the Authlib library. Here's the flow, step by step:

1. User clicks "Sign in with Google" → the browser is redirected to `/auth/google/login`.
2. That endpoint redirects the browser again, this time to Google's own login page, along with a callback URL (`/auth/google/callback`) telling Google where to send the user back.
3. User logs into Google and approves access. Google redirects back to the callback URL with a temporary authorization code.
4. The backend exchanges that code for the user's profile (`sub` — Google's permanent user ID, `email`, `name`).
5. The backend looks up (or creates) a matching row in the `users` table, keyed by that `sub` value.
6. The backend writes **only the user's ID** — not their Google token — into an encrypted session cookie (`request.session["user_id"] = user.id`).

**Why store only the ID, not the whole Google token, in the session?** Minimizing what's in the cookie limits the damage if the cookie were ever intercepted — it can't be used to impersonate the user on Google's own services, only to identify them within this app's own database.

### The "guest" fallback

Every route that needs to know who's asking calls `get_current_user_id()`, which reads the `user_id` from the session — and **falls back to the literal string `"guest"` if nobody is logged in**:

```python
def get_current_user_id(request: Request, db: Session = Depends(get_db)) -> str:
    user_id = request.session.get("user_id")
    return user_id if user_id else "guest"
```

This is a deliberate product decision, not an oversight: it lets someone use the summarizer and even subscribe to channels *without* creating an account first, while still keeping their data scoped separately from other users' data (every `Channel` row has a `user_id` column, so all "guest" users technically do share one bucket — worth knowing if you ever see two anonymous users' subscriptions mixing together, that's why).

### A real gotcha worth knowing

In `main.py`, the session cookie is configured as:

```python
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET_KEY", "default-dev-secret-key-recap-summarizer"),
    same_site="none",
    https_only=True,
)
```

`https_only=True` means the cookie will **not** be set at all over plain `http://localhost`. This setting was deliberately hardcoded for production deployment (cross-site cookies over HTTPS), which means local development over HTTP will silently fail to persist login — a classic "works in prod, broken locally" trap if you don't know to look for it.

---

## 5. Rate limiting, without Redis

Three endpoints (`/summarize`, `/chat`, `/email/send`) are protected by a **token bucket limiter**, implemented from scratch in `core/rate_limiter.py` rather than pulling in a library like `slowapi` or a Redis-backed one.

The idea: each client IP has a "bucket" that holds a limited number of tokens. Every request costs one token. Tokens refill slowly over time (e.g. summarization refills at 1 token per 15 seconds, capacity 2 — meaning you can burst two requests back-to-back, then must wait). If the bucket's empty, the request gets rejected with a 429 error.

**Why build this instead of using Redis-backed rate limiting?** Redis means running (and paying for, or self-hosting) a separate service just to track counters — overkill for a single-server portfolio app. The tradeoff: this in-memory bucket resets if the server restarts, and won't work correctly if the app is ever scaled to multiple server instances (each instance would have its own separate buckets, effectively multiplying the real limit). That's an acceptable tradeoff at this project's scale, but a genuine limitation to be aware of before assuming this pattern scales to "real" production traffic.

---

## 6. Database schema

All defined in `backend/app/models.py`:

| Table | Purpose | Notable design choice |
|---|---|---|
| `users` | One row per Google account that's logged in | `id` is Google's `sub` claim, not an auto-increment integer — guarantees uniqueness without a lookup |
| `summaries` | Every summary a logged-in user has generated | `summary_content` stores a JSON string, not separate columns per section — flexible since different styles produce different structures |
| `channels` | Subscribed YouTube channels | Composite primary key of `(id, user_id)` — the same YouTube channel can be subscribed to independently by multiple users |
| `channel_snapshots` | Point-in-time subscriber/view counts | Populated by a periodic snapshot job (see [FEATURES.md](./FEATURES.md#channel-subscriptions--growth-tracking)), enables growth-over-time charts |
| `partial_summaries` | Temporary cache of in-progress chunk summaries | Unique constraint on `(video_id, style, chunk_index)` prevents duplicate work; rows are deleted once the full summary completes successfully (see [AI_PIPELINE.md](./AI_PIPELINE.md)) |

---

## 7. Environment configuration

Secrets and environment-specific values (API keys, frontend/backend URLs) are never hardcoded — they're read from environment variables via `os.getenv()`, with sensible localhost defaults for local dev. See [GETTING_STARTED.md](./GETTING_STARTED.md) for the full list of required variables and how to obtain each one.
