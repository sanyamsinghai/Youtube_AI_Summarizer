import { useState } from "react";

// Same formats your backend already parses: watch, live, shorts,
// youtu.be, embed.
const YT_URL_PATTERN =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|live\/|shorts\/|embed\/)|youtu\.be\/)[\w-]+/i;

const STYLES = [
  { key: "bullets", name: "Bullet Points" },
  { key: "brief", name: "Executive Brief" },
  { key: "student_notes", name: "Student Notes" },
  { key: "narrative", name: "Narrative Recap" },
  { key: "action_items", name: "Action Items" },
];

export default function HomeScreen({ initialUrl = "", initialStyle = "bullets", onSubmit }) {
  const [url, setUrl] = useState(initialUrl);
  const [selectedStyle, setSelectedStyle] = useState(initialStyle);
  const [touched, setTouched] = useState(false);

  const isValid = YT_URL_PATTERN.test(url.trim());

  function handleSubmit(e) {
    e.preventDefault();
    setTouched(true);
    if (!isValid) return;
    onSubmit(url.trim(), selectedStyle);
  }

  return (
    <>
      {/* Title & Description rendered directly on the background (no wrapping card) */}
      <div 
        className="home-header-banner" 
        style={{ 
          textAlign: "center", 
          marginBottom: "28px", 
          width: "100%", 
          maxWidth: "680px", 
          marginLeft: "auto", 
          marginRight: "auto",
          animation: "fadeInSlide 0.25s cubic-bezier(0.16, 1, 0.3, 1) both"
        }}
      >
        <h1 style={{ fontSize: "32px", fontWeight: "800", margin: "0 0 10px 0", color: "var(--ink)", letterSpacing: "-0.75px" }}>
          Paste a YouTube link
        </h1>
        <p className="subtext" style={{ fontSize: "14px", color: "var(--ink-dim)", margin: 0, lineHeight: "1.6", maxWidth: "520px", marginLeft: "auto", marginRight: "auto" }}>
          Works with watch, live, shorts, youtu.be, and embed links. We'll pull the transcript and get it ready to summarize.
        </p>
      </div>

      {/* The single container for taking input (no outer enclosing card) */}
      <div className="panel home-input-card" style={{ display: "flex", flexDirection: "column", padding: "32px" }}>

        <form onSubmit={handleSubmit} style={{ width: "100%", display: "flex", flexDirection: "column", marginTop: "8px" }}>
          <input
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={() => setTouched(true)}
            autoFocus
            style={{
              width: "100%",
              border: "none",
              borderBottom: "1px solid var(--border-strong)",
              borderRadius: 0,
              background: "transparent",
              fontSize: "15px",
              color: "var(--ink)",
              fontFamily: "var(--font-mono)",
              outline: "none",
              padding: "12px 0 16px 0",
              transition: "border-color 0.2s ease"
            }}
          />
          {touched && !isValid && (
            <p className="error-text" style={{ marginTop: "8px" }}>
              That doesn't look like a YouTube link yet — check the format and try again.
            </p>
          )}

          {/* Bottom-right action row inside the same container */}
          <div className="home-action-row" style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "10px", marginTop: "20px" }}>
            <select
              id="summary-style-select"
              value={selectedStyle}
              onChange={(e) => setSelectedStyle(e.target.value)}
              style={{
                padding: "8px 12px",
                fontSize: "13px",
                fontWeight: "500",
                borderRadius: "6px",
                border: "1px solid var(--border-strong)",
                background: "var(--bg-elevated)",
                color: "var(--ink)",
                cursor: "pointer",
                fontFamily: "var(--font-body)",
                outline: "none",
                minWidth: "150px",
                height: "38px"
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
              disabled={!isValid}
              style={{ height: "38px", padding: "8px 20px", fontSize: "13px" }}
            >
              Summarize
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
