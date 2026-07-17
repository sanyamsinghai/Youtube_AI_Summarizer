import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import HomeScreen from "../components/HomeScreen.jsx";
import ResultScreen from "../components/ResultScreen.jsx";
import { summarizeVideo } from "../api/client.js";

const SESSION_KEY = "recap_summarizer_state";

// Map raw backend/network errors to polished user-facing messages
function friendlyError(err) {
  const msg = (err?.message || "").toLowerCase();
  if (msg.includes("valid youtube") || msg.includes("invalid") || msg.includes("url")) {
    return "That doesn't look like a valid YouTube link. Please check the URL and try again.";
  }
  if (msg.includes("captions") || msg.includes("transcript") || msg.includes("subtitles")) {
    return "This video doesn't have captions available. Try a different video with subtitles enabled.";
  }
  if (msg.includes("high demand") || msg.includes("rate") || msg.includes("busy") || msg.includes("429")) {
    return "Our servers are a bit busy right now. Please wait a moment and try again.";
  }
  if (msg.includes("non-json") || msg.includes("failed to fetch") || msg.includes("network")) {
    return "Couldn't reach the server. Please check your connection and try again.";
  }
  return "Something went wrong while processing this video. Please try again in a moment.";
}

function summaryCacheKey(url, style) {
  return `${url}|${style}`;
}

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(state) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch {
    /* ignore storage errors */
  }
}

export default function SummarizerPage() {
  // Restore from sessionStorage on mount so navigating to /features and back keeps the summary
  const saved = loadSession();

  const [step, setStep] = useState(saved?.step ?? "home");
  const [url, setUrl] = useState(saved?.url ?? "");
  const [style, setStyle] = useState(saved?.style ?? "bullets");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(saved?.error ?? null);
  const [data, setData] = useState(saved?.data ?? null);
  const [summaryCache, setSummaryCache] = useState(
    saved?.data ? { key: summaryCacheKey(saved.url ?? "", saved.style ?? "bullets"), data: saved.data } : null
  );

  const location = useLocation();

  // Persist to sessionStorage whenever key state changes
  useEffect(() => {
    saveSession({ step, url, style, data, error });
  }, [step, url, style, data, error]);

  // When RECAP logo is clicked it navigates to / with state.resetToHome=true
  // Detect this and force the component back to the home screen
  useEffect(() => {
    if (location.state?.resetToHome) {
      setStep("home");
      setUrl("");
      setStyle("bullets");
      setData(null);
      setError(null);
      setSummaryCache(null);
      sessionStorage.removeItem(SESSION_KEY);
    }
  }, [location]);

  async function fetchSummary(targetUrl, targetStyle) {
    const cacheKey = summaryCacheKey(targetUrl, targetStyle);

    if (summaryCache?.key === cacheKey) {
      setData(summaryCache.data);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const result = await summarizeVideo({ url: targetUrl, style: targetStyle });
      setData(result);
      setSummaryCache({ key: cacheKey, data: result });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  function handleBackFromResult() {
    setStep("home");
  }

  function handleStartOver() {
    setUrl("");
    setStyle("bullets");
    setData(null);
    setError(null);
    setSummaryCache(null);
    setStep("home");
    sessionStorage.removeItem(SESSION_KEY);
  }

  return (
    <>
      {step === "home" && (
        <div className="welcome-row">
          Welcome, Sanyam
        </div>
      )}

      {step === "home" && (
        <HomeScreen
          initialUrl={url}
          initialStyle={style}
          onSubmit={(submittedUrl, selectedStyle) => {
            setUrl(submittedUrl);
            setStyle(selectedStyle);
            setStep("result");
            fetchSummary(submittedUrl, selectedStyle);
          }}
        />
      )}

      {step === "result" && (
        <ResultScreen
          loading={loading}
          error={error}
          data={data}
          onBack={handleBackFromResult}
          onStartOver={handleStartOver}
          onStartNewSummary={(submittedUrl, selectedStyle) => {
            setUrl(submittedUrl);
            setStyle(selectedStyle);
            setStep("result");
            fetchSummary(submittedUrl, selectedStyle);
          }}
        />
      )}
    </>
  );
}
