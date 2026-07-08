import { useState } from "react";
import { sendSummaryEmail } from "../api/client.js";

const STYLE_LABELS = {
  bullets: "Bullet Points",
  brief: "Executive Brief",
  student_notes: "Student Notes",
  narrative: "Narrative Recap",
  action_items: "Action Items",
};



function parseInlineMarkdown(text) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function renderSummaryBody(summary) {
  if (Array.isArray(summary)) {
    return (
      <ul className="summary-ul">
        {summary.map((line, i) => (
          <li key={i} className="summary-li">{parseInlineMarkdown(line)}</li>
        ))}
      </ul>
    );
  }

  const lines = String(summary).split("\n");
  const renderedElements = [];
  let currentList = null;

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentList) {
        renderedElements.push(currentList);
        currentList = null;
      }
      return;
    }

    // Header 2: ## Header
    if (trimmed.startsWith("## ")) {
      if (currentList) {
        renderedElements.push(currentList);
        currentList = null;
      }
      renderedElements.push(
        <h2 key={`h2-${idx}`} className="summary-h2">
          {parseInlineMarkdown(trimmed.slice(3))}
        </h2>
      );
      return;
    }

    // Header 3: ### Header
    if (trimmed.startsWith("### ")) {
      if (currentList) {
        renderedElements.push(currentList);
        currentList = null;
      }
      renderedElements.push(
        <h3 key={`h3-${idx}`} className="summary-h3">
          {parseInlineMarkdown(trimmed.slice(4))}
        </h3>
      );
      return;
    }

    // Bullet list: * item or - item
    const bulletMatch = trimmed.match(/^[\*\-]\s+(.*)$/);
    if (bulletMatch) {
      if (!currentList || currentList.type !== "ul") {
        if (currentList) renderedElements.push(currentList);
        currentList = {
          type: "ul",
          key: `list-ul-${idx}`,
          items: [],
        };
      }
      currentList.items.push(
        <li key={`li-${idx}`} className="summary-li">
          {parseInlineMarkdown(bulletMatch[1])}
        </li>
      );
      return;
    }

    // Numbered list: 1. item
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      if (!currentList || currentList.type !== "ol") {
        if (currentList) renderedElements.push(currentList);
        currentList = {
          type: "ol",
          key: `list-ol-${idx}`,
          items: [],
        };
      }
      currentList.items.push(
        <li key={`li-${idx}`} className="summary-li">
          {parseInlineMarkdown(numMatch[2])}
        </li>
      );
      return;
    }

    // Normal paragraph
    if (currentList) {
      renderedElements.push(currentList);
      currentList = null;
    }
    renderedElements.push(
      <p key={`p-${idx}`} className="summary-p">
        {parseInlineMarkdown(trimmed)}
      </p>
    );
  });

  if (currentList) {
    renderedElements.push(currentList);
  }

  return renderedElements.map((el) => {
    if (el.type === "ul") {
      return <ul key={el.key} className="summary-ul">{el.items}</ul>;
    }
    if (el.type === "ol") {
      return <ol key={el.key} className="summary-ol">{el.items}</ol>;
    }
    return el;
  });
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
