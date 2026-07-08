import { useState } from "react";
import StepIndicator from "./components/StepIndicator.jsx";
import HomeScreen from "./components/HomeScreen.jsx";
import StyleSelector from "./components/StyleSelector.jsx";
import ResultScreen from "./components/ResultScreen.jsx";
import { summarizeVideo } from "./api/client.js";

function summaryCacheKey(url, style) {
  return `${url}|${style}`;
}

export default function App() {
  const [step, setStep] = useState("home"); // home | style | result
  const [url, setUrl] = useState("");
  const [style, setStyle] = useState(null);

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

  function handleHomeSubmit(submittedUrl) {
    setUrl(submittedUrl);
    setStep("style");
  }

  function handleStyleSubmit(selectedStyle) {
    setStyle(selectedStyle);
    setStep("result");
    fetchSummary(url, selectedStyle);
  }

  function handleBackFromResult() {
    setStep("style");
  }

  function handleStartOver() {
    setUrl("");
    setStyle(null);
    setData(null);
    setError(null);
    setSummaryCache(null);
    setStep("home");
  }

  return (
    <div className="app-shell">
      <div className="app-header">
        <span className="app-title">
          YouTube AI Summarizer<span className="sub"> · Paste, choose a style, get a summary</span>
        </span>
      </div>

      <StepIndicator currentStep={step} />

      {step === "home" && <HomeScreen initialUrl={url} onSubmit={handleHomeSubmit} />}

      {step === "style" && (
        <StyleSelector
          initialStyle={style}
          onBack={() => setStep("home")}
          onSubmit={handleStyleSubmit}
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
    </div>
  );
}
