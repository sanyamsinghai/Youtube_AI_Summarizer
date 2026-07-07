// ---------------------------------------------------------------
// ASSUMPTION: these two endpoints don't exist verbatim yet — this
// is the contract Phase 4 needs from your Phase 3 backend. Wire
// them up (or rename to match what you already built) before
// this frontend will actually work end to end.
//
//   POST /summarize
//     body: { url: string, style: string }
//     -> { video_id, title, summary, style }
//     summary shape: for "bullets"/"action_items" styles, an array
//     of strings. For "brief"/"student_notes"/"narrative", a single
//     string. Adjust renderSummary() in ResultScreen if your real
//     shape differs.
//
//   POST /email/send
//     body: { video_id, title, summary, style, email }
//     -> { success: true }  OR  { success: false, reason: string }
//     `reason` should be the human-readable rejection message from
//     your existing disposable-email / Resend validation, so the
//     UI can show it directly instead of a generic error.
// ---------------------------------------------------------------

const BASE_URL = "/api"; // proxied to your FastAPI backend by vite.config.js

async function request(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error("Backend returned a non-JSON response.");
  }

  if (!res.ok) {
    throw new Error(data?.detail || data?.message || `Request failed (${res.status})`);
  }

  return data;
}

export function summarizeVideo({ url, style }) {
  return request("/summarize", { url, style });
}

export function sendSummaryEmail({ videoId, title, summary, style, email }) {
  return request("/email/send", {
    video_id: videoId,
    title,
    summary,
    style,
    email,
  });
}
