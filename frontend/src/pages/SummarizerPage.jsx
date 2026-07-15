import { useState } from "react";
import HomeScreen from "../components/HomeScreen.jsx";
import ResultScreen from "../components/ResultScreen.jsx";
import { summarizeVideo } from "../api/client.js";

function summaryCacheKey(url, style) {
  return `${url}|${style}`;
}

export default function SummarizerPage() {
  const [step, setStep] = useState("home"); // home | result
  const [url, setUrl] = useState("");
  const [style, setStyle] = useState("bullets");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [summaryCache, setSummaryCache] = useState(null);

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
      setError(err.message || "Couldn't generate a summary for that video.");
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
        />
      )}
    </>
  );
}
