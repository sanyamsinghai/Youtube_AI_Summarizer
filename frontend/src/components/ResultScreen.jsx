import { useState } from "react";
import { sendSummaryEmail } from "../api/client.js";
import ChatWidget from "./ChatWidget.jsx";

const STYLES = [
  { key: "bullets", name: "Bullet Points" },
  { key: "brief", name: "Executive Brief" },
  { key: "student_notes", name: "Student Notes" },
  { key: "narrative", name: "Narrative Recap" },
  { key: "action_items", name: "Action Items" },
];

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

export default function ResultScreen({ loading, error, data, onStartOver, onBack, onStartNewSummary }) {
  const [email, setEmail] = useState("");
  const [emailState, setEmailState] = useState("idle"); // idle | sending | success | failure
  const [emailError, setEmailError] = useState("");
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [selectedShareOption, setSelectedShareOption] = useState(null); // null | 'email'

  // Follow-up search card state
  const [followUpUrl, setFollowUpUrl] = useState("");
  const [followUpStyle, setFollowUpStyle] = useState("bullets");

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

  function handleFollowUpSubmit(e) {
    e.preventDefault();
    if (!followUpUrl.trim()) return;
    onStartNewSummary(followUpUrl.trim(), followUpStyle);
    setFollowUpUrl("");
  }

  if (loading) {
    return (
      <div className="panel skeleton-panel">
        <div className="skeleton-header">
          <div className="skeleton-title shimmer" />
          <div className="skeleton-badge shimmer" />
        </div>
        <div className="skeleton-body">
          <div className="skeleton-line shimmer w-90" />
          <div className="skeleton-line shimmer w-80" />
          <div className="skeleton-line shimmer w-95" />
          <div className="skeleton-line shimmer w-60" />
          <div className="skeleton-line shimmer w-85" style={{ marginTop: "24px" }} />
          <div className="skeleton-line shimmer w-90" />
          <div className="skeleton-line shimmer w-70" />
        </div>
      </div>
    );
  }

  if (error) {
    // Pick a relevant icon based on the error type
    const isBusy     = error.toLowerCase().includes("busy") || error.toLowerCase().includes("demand");
    const isNoCaption = error.toLowerCase().includes("caption") || error.toLowerCase().includes("subtitle");
    const isNetwork  = error.toLowerCase().includes("server") || error.toLowerCase().includes("connection");
    const icon = isBusy ? "⏳" : isNoCaption ? "🔇" : isNetwork ? "📡" : "⚠️";

    return (
      <div className="panel" style={{ textAlign: "center", padding: "48px 32px", maxWidth: "480px", margin: "0 auto" }}>
        <div style={{ fontSize: "40px", marginBottom: "16px" }}>{icon}</div>
        <h2 style={{ margin: "0 0 10px", fontSize: "18px", fontWeight: 700, color: "var(--ink)" }}>
          {isBusy ? "We're a bit busy" : isNoCaption ? "No captions available" : isNetwork ? "Connection issue" : "Couldn't process this video"}
        </h2>
        <p style={{ margin: "0 0 28px", fontSize: "14px", color: "var(--ink-dim)", lineHeight: "1.6" }}>
          {error}
        </p>
        <div className="btn-row" style={{ justifyContent: "center" }}>
          <button type="button" className="btn btn-ghost" onClick={onBack}>
            ← Try another URL
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
    <>
    <div className="panel">
      {/* Title & Share button wrapper (Aligned to the Top Right of the card) */}
      <div className="result-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "20px", position: "relative" }}>
        <h1 style={{ margin: 0, fontSize: "22px", lineHeight: "1.3", color: "var(--ink)", flex: 1 }}>{data.title}</h1>
        
        {/* Share Button on the Top Right */}
        <div className="share-section" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0, position: "relative" }}>
          <button
            type="button"
            className="share-btn"
            onClick={() => {
              setShowShareMenu(!showShareMenu);
              setSelectedShareOption(null);
            }}
            style={{ height: "36px" }}
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
            <div className="share-menu" style={{ position: "absolute", top: "42px", right: 0, zIndex: 10, animation: "fadeInSlide 0.2s ease-out" }}>
              {/* WhatsApp option (disabled) */}
              <button type="button" className="share-option" disabled>
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
      </div>

      <div className="transcript-paper">{renderSummaryBody(data.summary)}</div>

      {/* Email floating modal overlay — centered on screen */}
      {selectedShareOption === "email" && (
        <div
          onClick={() => setSelectedShareOption(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.35)",
            backdropFilter: "blur(4px)",
            animation: "fadeIn 0.2s ease-out"
          }}
        >
          {/* Stop click from bubbling to backdrop */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "420px",
              margin: "0 20px",
              background: "var(--bg-card)",
              border: "1px solid var(--border-strong)",
              borderRadius: "12px",
              padding: "28px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              animation: "scaleIn 0.2s cubic-bezier(0.34,1.56,0.64,1)"
            }}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setSelectedShareOption(null)}
              aria-label="Close"
              style={{
                float: "right",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--ink-dim)",
                fontSize: "20px",
                lineHeight: 1,
                marginTop: "-4px"
              }}
            >×</button>

            {emailState !== "success" ? (
              <form onSubmit={handleSendEmail}>
                <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: 700, color: "var(--ink)" }}>Email this summary</h3>
                <p style={{ margin: "0 0 16px 0", fontSize: "12.5px", color: "var(--ink-dim)" }}>
                  We'll send a copy of this recap straight to your inbox.
                </p>
                <input
                  id="delivery-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  style={{ width: "100%", marginBottom: "12px" }}
                />
                {emailState === "failure" && (
                  <p style={{ fontSize: "12px", color: "var(--error, #d44)", margin: "0 0 8px 0" }}>{emailError}</p>
                )}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setSelectedShareOption(null)}
                    style={{ padding: "8px 14px", fontSize: "13px" }}
                  >Cancel</button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={emailState === "sending"}
                    style={{ padding: "8px 16px", fontSize: "13px" }}
                  >
                    {emailState === "sending" ? "Sending…" : "Send email"}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <p style={{ fontSize: "28px", margin: "0 0 8px 0" }}>✓</p>
                <p style={{ fontWeight: 600, fontSize: "14px", color: "var(--ink)", margin: "0 0 4px 0" }}>Email sent!</p>
                <p style={{ fontSize: "12.5px", color: "var(--ink-dim)", margin: 0 }}>Sent to {email}. Check your inbox.</p>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setSelectedShareOption(null)}
                  style={{ marginTop: "16px", padding: "8px 18px", fontSize: "13px" }}
                >Close</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Follow-up input container at bottom of summary card */}
      <div style={{ marginTop: "32px", borderTop: "1px solid var(--border)", paddingTop: "28px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "4px", color: "var(--ink)" }}>Summarize another video</h3>
        <p className="subtext" style={{ fontSize: "12.5px", color: "var(--ink-dim)", marginBottom: "16px" }}>
          Paste another YouTube URL below to generate a new summary.
        </p>
        
        <div className="home-input-card" style={{ display: "flex", flexDirection: "column", padding: "24px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "8px" }}>
          <form onSubmit={handleFollowUpSubmit} style={{ width: "100%", display: "flex", flexDirection: "column" }}>
            <input
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={followUpUrl}
              onChange={(e) => setFollowUpUrl(e.target.value)}
              required
              style={{
                width: "100%",
                border: "none",
                borderBottom: "1px solid var(--border-strong)",
                borderRadius: 0,
                background: "transparent",
                fontSize: "14.5px",
                color: "var(--ink)",
                fontFamily: "var(--font-mono)",
                outline: "none",
                padding: "8px 0 12px 0",
              }}
            />
            
            <div className="home-action-row" style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "10px", marginTop: "16px" }}>
              <select
                value={followUpStyle}
                onChange={(e) => setFollowUpStyle(e.target.value)}
                style={{
                  padding: "6px 12px",
                  fontSize: "12.5px",
                  fontWeight: "500",
                  borderRadius: "6px",
                  border: "1px solid var(--border-strong)",
                  background: "var(--bg-elevated)",
                  color: "var(--ink)",
                  cursor: "pointer",
                  fontFamily: "var(--font-body)",
                  outline: "none",
                  minWidth: "140px",
                  height: "36px"
                }}
              >
                {STYLES.map((st) => (
                  <option key={st.key} value={st.key}>
                    {st.name}
                  </option>
                ))}
              </select>

              <button 
                type="submit" 
                className="btn btn-primary"
                style={{ height: "36px", padding: "6px 16px", fontSize: "12.5px" }}
              >
                Summarize
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    {/* Floating chat widget — fixed to bottom-right, always visible while reading */}
    <ChatWidget videoId={data.video_id} />
    </>
  );
}
