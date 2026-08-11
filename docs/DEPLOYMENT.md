# 🌐 Production Deployment Guide

This guide walks you through deploying **Recap** (the YouTube AI Summarizer) to a production environment. 

We recommend a **split-deployment topology** for the best performance and cost efficiency:
* **Frontend:** [Vercel](https://vercel.com) (Static React/Vite hosting on a global CDN — Free tier)
* **Backend:** [Render](https://render.com) (FastAPI Python container — Free tier)
* **Database:** [Supabase](https://supabase.com) (Cloud PostgreSQL for persistence — Free tier)

---

## 🗺️ Deployment Topology

```mermaid
graph LR
    User([User Browser]) -->|Loads Assets| Vercel[Vercel Frontend]
    User -->|API Requests & OAuth| Render[Render Backend]
    Render -->|Queries & Saves| Supabase[(Supabase Postgres)]
```

---

## 🗄️ Step 1: Provision your Supabase Database
Render's Free tier does not support persistent disks. To prevent your user accounts and summary history from being wiped when Render restarts, use Supabase for free PostgreSQL persistence.

1. Go to [Supabase](https://supabase.com) and sign in.
2. Click **New Project** and select/create an organization.
3. Configure your project:
   * **Name:** `recap-db`
   * **Database Password:** Generate and securely save a password.
   * **Region:** Choose a region close to your target audience (or close to Render's default region: `us-east-1` or `Oregon`).
4. Click **Create new project** and wait for provisioning to finish (approx. 2 minutes).
5. Retrieve your database connection string:
   * Go to **Project Settings** (gear icon) → **Database**.
   * Under **Connection string**, select **URI**.
   * Copy the URI. It will look like: `postgresql://postgres.[username]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`
   * Replace `[password]` with your actual database password. Keep this URI ready.

---

## 🎛️ Step 2: Deploy Backend to Render
FastAPI runs inside a Docker container, executing transcription downloads, Groq summaries, and email delivery.

1. Go to [Render](https://render.com) and log in.
2. Click **New +** → **Web Service**.
3. Connect your GitHub repository.
4. Configure the service settings:
   * **Name:** `recap-backend` (your domain will be `https://recap-backend.onrender.com`)
   * **Region:** Select the same region you used for Supabase if possible.
   * **Branch:** `main`
   * **Runtime:** `Docker`
   * **Dockerfile Path:** `./Dockerfile`
   * **Instance Type:** `Free`
5. Click **Advanced** to add the following **Environment Variables**:

| Key | Value | Description |
|---|---|---|
| `ENV` | `production` | Enables production optimizations |
| `DATABASE_URL` | *Your Supabase URI* | Connection string copied in Step 1 |
| `YOUTUBE_API_KEY` | *Your YouTube API Key* | Google Cloud Youtube Data API v3 key |
| `GROQ_API_KEY` | *Your Groq API Key* | Groq Cloud Console API key |
| `RESEND_API_KEY` | *Your Resend API Key* | Resend SDK credential |
| `RESEND_FROM_EMAIL` | `summaries@yourdomain.com` | Verified domain sender email on Resend |
| `GOOGLE_CLIENT_ID` | *Your Google Client ID* | OAuth Client ID |
| `GOOGLE_CLIENT_SECRET`| *Your Google Client Secret* | OAuth Client Secret |
| `SESSION_SECRET_KEY` | *Secure random string* | Any long random string to sign cookies |
| `SESSION_SAME_SITE` | `none` | **CRITICAL:** Allows cross-site cookie transfers |
| `SESSION_HTTPS_ONLY` | `true` | **CRITICAL:** Forces secure cookies over HTTPS |
| `BACKEND_URL` | `https://recap-backend.onrender.com` | This Render service's URL (no trailing slash) |
| `FRONTEND_URL` | `https://recap-frontend.vercel.app` | Your Vercel frontend URL (from Step 3) |

6. Click **Create Web Service**. Render will begin building the Docker image and starting the FastAPI server.

---

## 🎨 Step 3: Deploy Frontend to Vercel
Vercel hosts the React client. It is configured to build the `frontend` subdirectory and communicate with the Render API.

1. Go to [Vercel](https://vercel.com) and sign in.
2. Click **Add New** → **Project**.
3. Import your GitHub repository.
4. Configure the project settings:
   * **Framework Preset:** `Vite`
   * **Root Directory:** Click **Edit** and select the `frontend` folder (this is crucial!).
   * **Build and Output Settings:** Leave default (`npm run build` and `dist` output).
5. Expand the **Environment Variables** section and add:

| Key | Value | Description |
|---|---|---|
| `VITE_API_URL` | `https://recap-backend.onrender.com` | URL of your Render backend service (no trailing slash) |

6. Click **Deploy**. Vercel will build the frontend assets and provision a production domain (e.g. `https://recap-frontend.vercel.app`).
7. **Note:** Once Vercel gives you your production URL, make sure to verify that it matches the `FRONTEND_URL` variable you input on the Render backend dashboard. If it differs, update it in Render and restart the backend.

---

## 🔑 Step 4: Align Google Cloud OAuth
To enable Google Sign-In across Vercel and Render, align your Google Cloud Console project redirects:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Select your project and navigate to **APIs & Services** → **Credentials**.
3. Edit your OAuth 2.0 Client ID under **OAuth 2.0 Client IDs**.
4. Update the fields:
   * **Authorized JavaScript Origins:** Add your Vercel URL, e.g., `https://recap-frontend.vercel.app`.
   * **Authorized Redirect URIs:** Add your Render callback URL, e.g., `https://recap-backend.onrender.com/auth/google/callback`.
5. Click **Save**. (It may take 5–10 minutes for Google to sync these changes globally).

---

## 💡 Troubleshooting & Gotchas

### 1. "Signed in, but UI still shows Guest"
* Ensure `SESSION_SAME_SITE` is set to `none` (lowercase) and `SESSION_HTTPS_ONLY` is set to `true` on the Render backend.
* Check that `VITE_API_URL` on Vercel and `BACKEND_URL` on Render match character-for-character, and that neither contains a trailing slash (`/`).
* Ensure you are visiting your frontend via `https://` (secure connection), as browsers block `SameSite=None` cookies over plain HTTP.

### 2. CORS Block Errors
* Double-check your Render `FRONTEND_URL` environment variable. If Vercel assigns a custom domain or a generated project branch domain (e.g. `https://recap-frontend-git-main-user.vercel.app`), the Render backend will reject the browser requests unless `FRONTEND_URL` is updated to match.

### 3. Supabase Schema Migration
* FastAPI uses SQLAlchemy with `Base.metadata.create_all(bind=engine)` inside `backend/app/main.py`. This means the application automatically creates tables (`users`, `summaries`, `channels`) on Supabase during its first boot. You do not need to run manual SQL migrations.

---

## 📦 Alternative: Unified Single-Service Deployment (Render Only)
If you prefer to deploy everything as a single service on Render without Vercel:

1. Render uses the `render.yaml` blueprint at the root of the project.
2. In the Render Dashboard, click **New +** → **Blueprint**.
3. Select your repository. Render will automatically parse `render.yaml` and set up the single Docker service.
4. Input the required environment variables when prompted.
5. In this case, `BACKEND_URL` and `FRONTEND_URL` will be identical (e.g. `https://recap-youtube-summarizer.onrender.com`).
