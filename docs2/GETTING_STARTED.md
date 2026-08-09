# Getting Started

How to get Recap running on your own machine, from a clean clone to a working app in the browser.

---

## 1. Prerequisites

- **Python 3.10+** and **Node.js** (for the React frontend, via Vite)
- A **Google Cloud project** (for both the YouTube Data API key and OAuth login — see step 3)
- Free accounts on **Groq** (AI) and **Resend** (email)

## 2. Clone and install dependencies

```bash
git clone https://github.com/sanyamsinghai/Youtube_AI_Summarizer.git
cd Youtube_AI_Summarizer

# Backend
python -m venv venv
venv\Scripts\activate        # Windows. Use `source venv/bin/activate` on Mac/Linux
pip install -r backend/requirements.txt

# Frontend
cd frontend
npm install
cd ..
```

## 3. Environment variables — the real list

The repo's `.env.example` currently only lists 3 variables (`YOUTUBE_API_KEY`, `GROQ_API_KEY`, `RESEND_API_KEY`) — but the actual code reads **13**. If you only fill in those 3, OAuth login and sessions will silently fail. Here's the complete list, with where to get each one:

| Variable | Required? | Where to get it |
|---|---|---|
| `YOUTUBE_API_KEY` | Yes | [Google Cloud Console](https://console.cloud.google.com) → enable "YouTube Data API v3" → Credentials → API key |
| `GROQ_API_KEY` | Yes | [console.groq.com](https://console.groq.com) → API Keys (free tier) |
| `RESEND_API_KEY` | Yes | [resend.com](https://resend.com) → API Keys (free tier) |
| `RESEND_FROM_EMAIL` | Yes | An email address on a domain verified in your Resend account |
| `GOOGLE_CLIENT_ID` | Yes, for login | Google Cloud Console → Credentials → OAuth 2.0 Client ID (type: Web application) |
| `GOOGLE_CLIENT_SECRET` | Yes, for login | Comes paired with the Client ID above |
| `SESSION_SECRET_KEY` | Yes | Any long random string you generate yourself — used to sign the session cookie. Do not reuse the code's hardcoded fallback in anything beyond local testing. |
| `BACKEND_URL` | Yes | `http://localhost:8000` locally; your deployed backend URL in production |
| `FRONTEND_URL` | Yes | `http://localhost:5173` locally (Vite's default port); your deployed frontend URL in production |
| `GROQ_MODEL` | No (has a default) | Only set if you want to override the default 70B model used for chat/reduce |
| `GROQ_MAP_MODEL` | No (has a default) | Only set if you want to override the 8B chunk-summarization model — see [AI_PIPELINE.md](./AI_PIPELINE.md) |
| `GROQ_REDUCE_MODEL` | No (has a default) | Only set if you want to override the reduce-stage model |
| `GROQ_TEMPERATURE` | No (has a default) | Only set if you want the AI's output to be more/less deterministic |

Create a `.env` file in the project root with all the required ones filled in before starting either server.

**Important local-dev gotcha:** the session cookie is configured with `https_only=True` (see [ARCHITECTURE.md](./ARCHITECTURE.md#4-authentication-how-login-actually-works)), meaning login will not persist over plain `http://localhost`. If you need to test the login flow locally, you'll need to either run the backend behind a local HTTPS proxy, or temporarily relax that setting for your own testing — don't commit that change.

## 4. Getting your Google OAuth redirect URI right

When creating the OAuth Client ID in Google Cloud Console, you must add an **Authorized redirect URI** matching your backend's callback route exactly, e.g. `http://localhost:8000/auth/google/callback`. A mismatch here is the single most common OAuth setup error — Google will reject the login with a `redirect_uri_mismatch` error if this doesn't match character-for-character, including the port number.

## 5. Running the app

Two ways to start both servers:

**Option A — the launcher script (Windows):**
```bash
start.bat
```
Opens two terminal windows: one running the FastAPI backend (`uvicorn backend.app.main:app --reload`), one running the Vite dev server (`npm run dev`).

**Option B — the interactive Python launcher:**
```bash
python main.py
```
Presents a menu (single-video summarizer, FastAPI backend, test summarizer, debug chunk helper, legacy batch script) — useful when you only want to run one specific piece rather than the whole stack, e.g. testing the summarizer directly without spinning up the API.

Once both are running: backend at `http://localhost:8000` (interactive API docs at `/docs`, generated automatically by FastAPI), frontend at `http://localhost:5173`.

## 6. Verifying it works

1. Open the frontend URL in your browser.
2. Paste any YouTube video URL with captions available, pick a style, submit.
3. If you get a summary back, the core pipeline (YouTube → transcript → Groq → response) is working end-to-end.
4. Try "Sign in with Google" separately to verify OAuth is configured correctly.

If step 2 fails, check the backend terminal window first — errors from the transcript fetcher or Groq API are printed there, not just returned to the frontend.
