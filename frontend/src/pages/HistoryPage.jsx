import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getUserSummaries, sendSummaryEmail } from "../api/client.js";
import ChatWidget from "../components/ChatWidget.jsx";

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

// PDF Icon SVG
const PDFIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "8px", verticalAlign: "middle" }}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);

function parseHistoryInlineMarkdown(text) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function renderHistorySummaryBody(summary) {
  if (Array.isArray(summary)) {
    return (
      <ul className="summary-ul">
        {summary.map((line, i) => (
          <li key={i} className="summary-li">
            {parseHistoryInlineMarkdown(line)}
          </li>
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
          {parseHistoryInlineMarkdown(trimmed.slice(3))}
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
          {parseHistoryInlineMarkdown(trimmed.slice(4))}
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
          {parseHistoryInlineMarkdown(bulletMatch[1])}
        </li>
      );
      return;
    }

    // Paragraph
    if (currentList) {
      renderedElements.push(currentList);
      currentList = null;
    }
    renderedElements.push(
      <p key={`p-${idx}`} className="summary-p">
        {parseHistoryInlineMarkdown(trimmed)}
      </p>
    );
  });

  if (currentList) {
    renderedElements.push(currentList);
  }

  return renderedElements.map((el) => {
    if (el.type === "ul") {
      return (
        <ul key={el.key} className="summary-ul">
          {el.items}
        </ul>
      );
    }
    return el;
  });
}

export default function HistoryPage() {
  const [summaries, setSummaries] = useState([]);
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Share feature states
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [selectedShareOption, setSelectedShareOption] = useState(null);
  const [email, setEmail] = useState("");
  const [emailState, setEmailState] = useState("idle"); // "idle" | "sending" | "success" | "failure"
  const [emailError, setEmailError] = useState("");
  
  const navigate = useNavigate();

  // Reset share states when changing active summary
  useEffect(() => {
    setShowShareMenu(false);
    setSelectedShareOption(null);
    setEmail("");
    setEmailState("idle");
    setEmailError("");
  }, [selectedSummary]);

  async function handleSendEmail(e) {
    e.preventDefault();
    if (!email || !selectedSummary) return;
    setEmailState("sending");
    setEmailError("");
    try {
      const res = await sendSummaryEmail({
        email,
        summary: selectedSummary.summary,
        title: selectedSummary.title,
        style: selectedSummary.style,
      });
      if (res.success) {
        setEmailState("success");
      } else {
        setEmailState("failure");
        setEmailError(res.reason || "Failed to send email");
      }
    } catch (err) {
      setEmailState("failure");
      setEmailError("Failed to send email");
    }
  }

  useEffect(() => {
    getUserSummaries()
      .then((data) => {
        if (data.detail && data.detail.includes("Not authenticated")) {
          setError("Please sign up or sign in to view your summary history.");
        } else {
          setSummaries(data);
        }
      })
      .catch((err) => {
        setError("Failed to load your history. Please try again.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

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
          <div className="skeleton-line shimmer w-60" style={{ marginTop: "20px" }} />
          <div className="skeleton-line shimmer w-85" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel" style={{ textAlign: "center", padding: "48px 32px", maxWidth: "480px", margin: "0 auto" }}>
        <div style={{ fontSize: "40px", marginBottom: "16px" }}>🔒</div>
        <h2 style={{ margin: "0 0 10px", fontSize: "18px", fontWeight: 700, color: "var(--ink)" }}>
          Access restricted
        </h2>
        <p style={{ margin: "0 0 28px", fontSize: "14px", color: "var(--ink-dim)", lineHeight: "1.6" }}>
          {error}
        </p>
        <button type="button" className="btn btn-primary" onClick={() => navigate("/")}>
          Return Home
        </button>
      </div>
    );
  }

  const detailsView = selectedSummary ? (
    <div>
      {/* Details header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "20px", borderBottom: "1px solid var(--border)", paddingBottom: "16px" }}>
        <div style={{ flex: 1 }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setSelectedSummary(null)}
            style={{ padding: "6px 12px", fontSize: "12px", height: "30px", marginBottom: "12px" }}
          >
            ← Back to History List
          </button>
          <h1 style={{ margin: 0, fontSize: "22px", lineHeight: "1.3", color: "var(--ink)" }}>
            {selectedSummary.title}
          </h1>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "12px" }}>
            <span className="style-badge" style={{ margin: 0 }}>
              {selectedSummary.style.replace("_", " ")}
            </span>
          </div>
        </div>
        
        {/* Share Button on the Top Right */}
        <div className="share-section" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0, position: "relative", marginTop: "42px" }}>
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

              {/* PDF option */}
              <button
                type="button"
                className="share-option"
                onClick={() => {
                  setShowShareMenu(false);
                  window.print();
                }}
              >
                <span>
                  <PDFIcon />
                  Export to PDF
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Details body */}
      <div className="transcript-paper">
        {renderHistorySummaryBody(selectedSummary.summary)}
      </div>
    </div>
  ) : null;

  const listView = !selectedSummary ? (
    <div>
      {/* List header */}
      <div style={{ marginBottom: "24px", borderBottom: "1px solid var(--border)", paddingBottom: "16px" }}>
        <h1 style={{ margin: "0 0 4px 0", fontSize: "24px", color: "var(--ink)" }}>Summary History</h1>
        <p className="subtext" style={{ fontSize: "13.5px", color: "var(--ink-dim)", margin: 0 }}>
          All your generated video summaries listed chronologically.
        </p>
      </div>

      {/* List content */}
      {summaries.length === 0 ? (
        <div style={{ color: "var(--ink-dim)", fontSize: "14px", padding: "40px 0", textAlign: "center" }}>
          No generated summaries found. Summarize a video from Home to start building your history!
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {summaries.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedSummary(item)}
              style={{
                padding: "16px 20px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--bg-card)",
                cursor: "pointer",
                transition: "border-color 0.15s, transform 0.1s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--border-strong)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              <h4 style={{ margin: "0 0 8px 0", fontSize: "15px", fontWeight: "600", color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>
                {item.title}
              </h4>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--ink-dim)" }}>
                <span style={{ textTransform: "capitalize" }}>Style: {item.style.replace("_", " ")}</span>
                <span>{new Date(item.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  ) : null;

  return (
    <>
      <div className="panel">
        {selectedSummary ? detailsView : listView}
      </div>
      {(selectedSummary || summaries.length > 0) && (
        <ChatWidget videoId={selectedSummary ? selectedSummary.video_id : summaries[0].video_id} />
      )}

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
    </>
  );
}



