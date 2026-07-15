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
    <div className="panel home-panel" style={{ position: "relative" }}>
      {/* Back arrow icon, top-left inside the card (non-functional placeholder for now) */}
      <div 
        className="back-arrow-placeholder" 
        aria-hidden="true" 
        title="Go Back"
        style={{ position: "absolute", top: "24px", left: "24px", opacity: 0.35, cursor: "default" }}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
      </div>

      <h1 style={{ marginTop: "12px" }}>Paste a YouTube link</h1>
      <p className="subtext">
        Works with watch, live, shorts, youtu.be, and embed links. We'll pull
        the transcript and get it ready to summarize.
      </p>

      <form onSubmit={handleSubmit} style={{ width: "100%", marginTop: "28px" }}>
        <div className="field">
          <label htmlFor="video-url">Video URL</label>
          <input
            id="video-url"
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={() => setTouched(true)}
            autoFocus
          />
          {touched && !isValid && (
            <p className="error-text">
              That doesn't look like a YouTube link yet — check the format and
              try again.
            </p>
          )}
        </div>

        {/* Bottom action row: dropdown on the left, button on the right */}
        <div className="home-action-row" style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "10px", marginTop: "24px" }}>
          <select
            id="summary-style-select"
            value={selectedStyle}
            onChange={(e) => setSelectedStyle(e.target.value)}
            style={{
              padding: "10px 14px",
              fontSize: "13.5px",
              fontWeight: "500",
              borderRadius: "8px",
              border: "1px solid var(--border-strong)",
              background: "var(--bg-elevated)",
              color: "var(--ink)",
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              outline: "none",
              minWidth: "160px",
              height: "44px"
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
            style={{ height: "44px", padding: "10px 24px", fontSize: "13.5px" }}
          >
            Summarize
          </button>
        </div>
      </form>
    </div>
  );
}
