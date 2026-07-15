import { useState } from "react";
import { sendSummaryEmail } from "../api/client.js";

// WhatsApp Logo SVG
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style={{ marginRight: "8px", verticalAlign: "middle" }}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.46h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

// Mail Icon SVG
const MailIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "8px", verticalAlign: "middle" }}>
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
    <polyline points="22,6 12,13 2,6"></polyline>
  </svg>
);

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
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [selectedShareOption, setSelectedShareOption] = useState(null); // null | 'email'

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
      <div className="result-header" style={{ marginBottom: "20px" }}>
        <h1>{data.title}</h1>
      </div>

      <div className="transcript-paper">{renderSummaryBody(data.summary)}</div>

      {/* Share Section Wrapper */}
      <div className="share-section" style={{ marginTop: "28px", display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
        <button
          type="button"
          className="share-btn"
          onClick={() => {
            setShowShareMenu(!showShareMenu);
            setSelectedShareOption(null);
          }}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "6px" }}>
            <circle cx="18" cy="5" r="3"></circle>
            <circle cx="6" cy="12" r="3"></circle>
            <circle cx="18" cy="19" r="3"></circle>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
          </svg>
          Share
        </button>

        {showShareMenu && (
          <div className="share-menu" style={{ animation: "fadeInSlide 0.2s ease-out" }}>
            {/* WhatsApp option (disabled) */}
            <button
              type="button"
              className="share-option"
              disabled
              title="WhatsApp delivery coming soon!"
            >
              <span>
                <WhatsAppIcon />
                WhatsApp
              </span>
              <span className="badge-coming-soon">Coming soon</span>
            </button>

            {/* Email option */}
            <button
              type="button"
              className="share-option"
              onClick={() => setSelectedShareOption(selectedShareOption === "email" ? null : "email")}
              style={{
                background: selectedShareOption === "email" ? "var(--bg-subtle)" : "transparent"
              }}
            >
              <span>
                <MailIcon />
                Email
              </span>
            </button>
          </div>
        )}
      </div>

      {/* If Email option selected, show the email form inline */}
      {selectedShareOption === "email" && (
        <div style={{ marginTop: "20px", width: "100%", animation: "fadeInSlide 0.2s ease-out" }}>
          {emailState !== "success" ? (
            <form className="field email-section" onSubmit={handleSendEmail} style={{ margin: 0, padding: "20px", background: "var(--bg-subtle)", borderRadius: "8px", border: "1px solid var(--border)" }}>
              <label htmlFor="delivery-email" style={{ fontWeight: 600, fontSize: "13px", color: "var(--ink)" }}>Email this summary</label>
              <p className="subtext" style={{ fontSize: "11.5px", marginTop: "2px", color: "var(--ink-dim)" }}>Enter your inbox address to receive a copy of this recap.</p>
              <input
                id="delivery-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ marginTop: "8px" }}
              />
              <div className="btn-row" style={{ marginTop: "12px" }}>
                <button type="submit" className="btn btn-primary" disabled={emailState === "sending"} style={{ padding: "8px 16px", fontSize: "12.5px" }}>
                  {emailState === "sending" ? "Sending…" : "Send email"}
                </button>
              </div>
              {emailState === "failure" && <p className="error-text" style={{ fontSize: "12px", marginTop: "8px" }}>{emailError}</p>}
            </form>
          ) : (
            <div className="email-status success" style={{ padding: "16px", background: "var(--bg-subtle)", borderRadius: "8px", border: "1px solid var(--border)", color: "var(--ink)", fontWeight: 500, fontSize: "13px" }}>
              ✓ Sent to {email}. Check your inbox.
            </div>
          )}
        </div>
      )}

      <div className="btn-row result-actions" style={{ marginTop: "32px", borderTop: "1px solid var(--border)", paddingTop: "20px" }}>
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
