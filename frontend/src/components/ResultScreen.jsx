import { useState } from "react";
import { sendSummaryEmail } from "../api/client.js";

const STYLE_LABELS = {
  bullets: "Bullet Points",
  brief: "Executive Brief",
  student_notes: "Student Notes",
  narrative: "Narrative Recap",
  action_items: "Action Items",
};

function renderSummaryBody(summary) {
  if (Array.isArray(summary)) {
    return (
      <ul>
        {summary.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    );
  }
  return String(summary)
    .split("\n")
    .filter(Boolean)
    .map((para, i) => <p key={i}>{para}</p>);
}

export default function ResultScreen({ loading, error, data, onStartOver, onBack }) {
  const [email, setEmail] = useState("");
  const [emailState, setEmailState] = useState("idle"); // idle | sending | success | failure
  const [emailError, setEmailError] = useState("");

  async function handleSendEmail(e) {
    e.preventDefault();
    setEmailState("sending");
    setEmailError("");
    try {
      const res = await sendSummaryEmail({
        videoId: data.video_id,
        title: data.title,
        summary: data.summary,
        style: data.style,
        email: email.trim(),
      });
      if (res.success) {
        setEmailState("success");
      } else {
        setEmailState("failure");
        setEmailError(res.reason || "Delivery was rejected — try a different address.");
      }
    } catch (err) {
      setEmailState("failure");
      setEmailError(err.message || "Something went wrong sending that email.");
    }
  }

  if (loading) {
    return (
      <div className="panel">
        <span className="eyebrow">Step 3</span>
        <h1>Fetching and summarizing…</h1>
        <p className="loading-line">
          <span className="spinner" /> Pulling the transcript and generating your summary
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel">
        <span className="eyebrow">Step 3</span>
        <h1>That one didn't work</h1>
        <p className="error-text">{error}</p>
        <div className="btn-row">
          <button type="button" className="btn btn-ghost" onClick={onBack}>
            ← Back
          </button>
          <button type="button" className="btn btn-primary" onClick={onStartOver}>
            Start over
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="panel">
      <div className="result-header">
        <span className="eyebrow">Step 3</span>
        <div className="style-badge">{STYLE_LABELS[data.style] || data.style}</div>
        <h1>{data.title}</h1>
      </div>

      <div className="transcript-paper">{renderSummaryBody(data.summary)}</div>

      {emailState !== "success" && (
        <form className="field email-section" onSubmit={handleSendEmail}>
          <label htmlFor="delivery-email">Email this summary (optional)</label>
          <p className="subtext">Want a copy in your inbox? Enter your address below.</p>
          <input
            id="delivery-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div className="btn-row">
            <button type="submit" className="btn btn-primary" disabled={emailState === "sending"}>
              {emailState === "sending" ? "Sending…" : "Send email"}
            </button>
          </div>
          {emailState === "failure" && <p className="error-text">{emailError}</p>}
        </form>
      )}

      {emailState === "success" && (
        <div className="email-status success">Sent to {email}. Check your inbox.</div>
      )}

      <div className="btn-row result-actions">
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          ← Change style
        </button>
        <button type="button" className="btn btn-ghost" onClick={onStartOver}>
          Summarize another video
        </button>
      </div>
    </div>
  );
}
