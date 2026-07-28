# 🚀 Getting Started & Local Setup Guide

This guide walks you through setting up **Recap** (the YouTube AI Summarizer) on your local machine from scratch, setting up keys, and running both the backend and frontend.

---

## 📋 Prerequisites

Make sure you have the following installed on your machine:
* **Python (version 3.10 or higher):** [Download Python](https://www.python.org/downloads/)
* **Node.js (version 18 or higher):** [Download Node.js](https://nodejs.org/)

---

## 🛠️ Step 1: Local Installation

### 1. Set Up the Backend
1. Open your terminal at the project root directory.
2. Create a Python virtual environment:
   ```bash
   python -m venv venv
   ```
3. Activate the virtual environment:
   * **On Windows (PowerShell):** `.\venv\Scripts\Activate.ps1`
   * **On Windows (Command Prompt):** `.\venv\Scripts\activate.bat`
   * **On macOS/Linux:** `source venv/bin/activate`
4. Install backend dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
   *(If a `requirements.txt` file is not present, the main dependencies are: `fastapi`, `uvicorn`, `sqlalchemy`, `groq`, `youtube-transcript-api`, `resend`, `google-auth`, `pydantic`, `python-dotenv`).*

### 2. Set Up the Frontend
1. Navigate into the frontend folder:
   ```bash
   cd frontend
   ```
2. Install the React packages:
   ```bash
   npm install
   ```

---

## 🔑 Step 2: Environment Configuration (`.env`)

In the project root directory, create a file named `.env` and configure the following 6 keys. Here is an explanation of what each key is and why it is needed:

```env
# 1. YouTube Data API Key
# Needed to search channels, fetch profile pictures, and list uploads playlists.
# Get it from the Google Cloud Console.
YOUTUBE_API_KEY=your_google_youtube_api_key_here

# 2. Groq Cloud API Key
# Needed to run completions on transcript text segments (Llama 3.1-8B & 3.3-70B).
# Get it from: https://console.groq.com/keys
GROQ_API_KEY=your_groq_api_key_here

# 3. Resend Mail API Key
# Needed to send summaries to user emails via HTML templates.
# Get it from: https://resend.com/
RESEND_API_KEY=your_resend_api_key_here

# 4. Google OAuth Client ID & Secret
# Needed to power the "Sign In with Google" credentials check on the UI.
# Get them from the Google Cloud Console Credentials screen.
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# 5. Verified Sender Email
# The email address used to send out the reports (must be registered on Resend).
RESEND_FROM_EMAIL=summaries@yourdomain.com
```

---

## 🌐 Step 3: Google OAuth Setup (Sign-in Settings)

To configure the Google login screen:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project and search for **APIs & Services** → **OAuth Consent Screen**.
3. **Configure Consent Screen:**
   * Enter your app name (e.g. `Recap`) and upload a logo. This is what users will see when signing in.
   * Under developer contact, input your email.
4. **Create Credentials:**
   * Go to the **Credentials** tab, click **Create Credentials** → **OAuth Client ID**.
   * Select **Web Application**.
   * **Authorized JavaScript Origins:** Add `http://localhost:5173` (where your React app runs).
   * **Authorized Redirect URIs:** Add `http://localhost:8000/auth/google/callback` (where Google sends login credentials back to FastAPI).
5. Copy the generated **Client ID** and **Client Secret** into your `.env` file.

---

## 🏃 Step 4: Running the Application

You can launch both the frontend and backend simultaneously using the provided startup script:

1. Open your terminal at the project root directory.
2. Run the bat file:
   ```bash
   .\start.bat
   ```
   *(This script activates your virtual environment, boots the FastAPI server on `http://localhost:8000`, and starts the Vite development server on `http://localhost:5173`).*
3. Open your browser and go to: **`http://localhost:5173`** to access Recap!
