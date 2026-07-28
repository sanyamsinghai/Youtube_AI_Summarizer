# 🌟 Recap Core Features Guide

This document outlines the main user-facing features of **Recap** (the YouTube AI Summarizer), how they work under the hood, and how to use them.

---

## 🔐 1. Google Sign-In & Auth

Recap supports standard user signup and login using Google OAuth.

* **How it works:**
  1. The user clicks "Sign Up with Google" on the UI.
  2. The browser redirects to Google's OAuth consent screen.
  3. Once authenticated, Google redirects back to the backend `/auth/google/callback` endpoint with an authorization code.
  4. The backend verifies the code, retrieves the user profile, registers/updates the user in the SQLite database, and creates a secure session cookie.
* **Important Customization Note:** The application name displayed on the Google login screen (e.g. "Recap" instead of "YouTube Summarizer") is configured in the **Google Cloud Console OAuth Consent Screen** settings, not in the local codebase.

---

## 📝 2. Dynamic Video Summarization

Users can paste any public YouTube video link on the home screen, select a style, and generate an AI-powered summary instantly.

* **Supported Styles:**
  * **Bullet Points:** A concise list of 6 to 8 core insights, each starting with bolded key terms.
  * **Executive Brief:** A professional, single-paragraph summary explaining context, main arguments, and final conclusions.
  * **Student Notes:** A highly structured study guide with headings for terminology, chronological breakdowns, and key takeaways.
  * **Narrative Recap:** A warm, conversational narrative explaining the video like a peer over coffee.
  * **Action Items:** A concrete, numbered list of step-by-step tasks, tools, and next steps recommended by the video.

---

## 📜 3. History Panel

Logged-in users have access to a dedicated **History Page** at `/history` containing all summaries they have generated in the past.

* **Features:**
  * **Persistent Storage:** Summaries are saved under the user's account in the SQLite `summaries` table.
  * **Detail Panel View:** Clicking on any historical summary opens a dedicated detailed panel on the right, keeping the main layout symmetrical.
  * **Filtering:** Summaries can be filtered or searched by video title and style.

---

## 💬 4. AI Chat Assistant (Chat with Video)

When viewing any summary (newly generated or loaded from history), a floating **Chat Widget** appears on the screen.

* **How it works:**
  * Users can ask questions about the video (e.g. *"What did he say about X?"* or *"Give me more code examples of Y"*).
  * The widget retrieves the full transcript of that specific video from the backend's in-memory `transcript_cache`.
  * It passes the full transcript context + the user's question to the AI model to generate highly accurate, contextual answers.
  * This allows users to search, extract, and drill down into details without having to scrub through hours of video audio.

---

## ✉️ 5. Summary Email Sharing

Users can email their summaries directly to colleagues, students, or themselves.

* **How it works:**
  * The user clicks the **Share** menu button in the summary header.
  * An email modal backdrop transitions onto the screen, requesting the recipient's email address.
  * The frontend validates the email syntax and sends a request to `/email/send`.
  * The backend connects to an SMTP mail relay and sends a beautifully formatted HTML email containing the video details and the full markdown summary.

---

## 📊 6. Channel Subscriptions & Dashboard

Recap provides a **Channel Explorer Dashboard** allowing users to subscribe to their favorite YouTube channels and track video stats.

* **Key Elements:**
  * **Explore & Search:** Users can look up channels, see channel statistics (subscriber count, video count), and subscribe.
  * **Subscribed List:** Subscribed channels are stored under the user's profile and displayed as clean grid cards on the dashboard.
  * **Upload Timeline:** Users can click on a subscribed channel to inspect its latest uploaded videos and trigger summarization runs on them directly.
  * **Analytics Snapshot:** Saves channel view and subscriber histories in `channel_snapshots` to monitor channel growth trends.
