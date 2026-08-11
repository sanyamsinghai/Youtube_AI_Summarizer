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

export const BACKEND_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:8000" : "");

// In development, use "/api" to trigger the Vite dev proxy.
// In production, use BACKEND_URL if set, otherwise relative paths "".
const BASE_URL = import.meta.env.DEV ? "/api" : (BACKEND_URL || "");

async function request(path, body, method = "POST") {
  const options = {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const res = await fetch(`${BASE_URL}${path}`, options);

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

export function subscribeToChannel(channelUrl) {
  return request("/channels/subscribe", { channel_url: channelUrl });
}

export function getChannels() {
  return request("/channels", null, "GET");
}

export function unsubscribeChannel(channelId) {
  return request(`/channels/${channelId}`, null, "DELETE");
}

export function getChannelVideos(channelId) {
  return request(`/channels/${channelId}/videos`, null, "GET");
}

export function getVideoComments(videoId) {
  return request(`/videos/${videoId}/comments`, null, "GET");
}

export function getChannelGrowth(channelId) {
  return request(`/channels/${channelId}/growth`, null, "GET");
}

export function lookupChannel(url) {
  return request(`/channels/lookup?url=${encodeURIComponent(url)}`, null, "GET");
}

export function getVideosByPlaylist(playlistId) {
  return request(`/channels/videos-by-playlist?playlist_id=${playlistId}`, null, "GET");
}

export function getGrowthByInfo(channelId, subscriberCount) {
  return request(`/channels/growth-by-info?channel_id=${channelId}&subscriber_count=${subscriberCount}`, null, "GET");
}

export function sendChatMessage({ videoId, message, history }) {
  return request("/chat", {
    video_id: videoId,
    message,
    history,
  });
}

export async function getCurrentUser() {
  const url = BACKEND_URL ? `${BACKEND_URL}/auth/me` : "/auth/me";
  const res = await fetch(url, { credentials: "include" });
  return res.json();
}

export async function getUserSummaries() {
  const url = BACKEND_URL ? `${BACKEND_URL}/auth/me/summaries` : "/auth/me/summaries";
  const res = await fetch(url, { credentials: "include" });
  return res.json();
}



