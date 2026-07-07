import { useState } from "react";

// Same formats your backend already parses: watch, live, shorts,
// youtu.be, embed. This is a UX check only — the backend remains
// the source of truth for validation, this just avoids a wasted
// round trip for obviously-wrong input.
const YT_URL_PATTERN =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|live\/|shorts\/|embed\/)|youtu\.be\/)[\w-]+/i;

export default function HomeScreen({ onSubmit }) {
  const [url, setUrl] = useState("");
  const [touched, setTouched] = useState(false);

  const isValid = YT_URL_PATTERN.test(url.trim());

  function handleSubmit(e) {
    e.preventDefault();
    setTouched(true);
    if (!isValid) return;
    onSubmit(url.trim());
  }

  return (
    <form className="panel" onSubmit={handleSubmit}>
      <span className="eyebrow">Step 1</span>
      <h1>Paste a YouTube link</h1>
      <p className="subtext">
        Works with watch, live, shorts, youtu.be, and embed links. We'll pull
        the transcript and get it ready to summarize.
      </p>

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

      <button type="submit" className="btn btn-primary" disabled={!isValid}>
        Continue →
      </button>
    </form>
  );
}
