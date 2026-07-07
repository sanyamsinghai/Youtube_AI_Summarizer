import { useState } from "react";
import Scrubber from "./components/Scrubber.jsx";
import HomeScreen from "./components/HomeScreen.jsx";
import StyleSelector from "./components/StyleSelector.jsx";
import DeliverySelector from "./components/DeliverySelector.jsx";
import ResultScreen from "./components/ResultScreen.jsx";
import { summarizeVideo } from "./api/client.js";

// This is intentionally a hand-rolled state machine instead of
// react-router: 4 linear screens with no need for deep-linking or
// browser back/forward yet. If you add things like a shareable
// result URL later, that's when react-router earns its keep — not
// before.
export default function App() {
  const [step, setStep] = useState("home"); // home | style | delivery | result
  const [url, setUrl] = useState("");
  const [style, setStyle] = useState(null);
  const [deliveryMethod, setDeliveryMethod] = useState("screen");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  function handleHomeSubmit(submittedUrl) {
    setUrl(submittedUrl);
    setStep("style");
  }

  function handleStyleSubmit(selectedStyle) {
    setStyle(selectedStyle);
    setStep("delivery");
  }

  async function handleDeliverySubmit(method) {
    setDeliveryMethod(method);
    setStep("result");
    setLoading(true);
    setError(null);
    try {
      const result = await summarizeVideo({ url, style });
      setData(result);
    } catch (err) {
      setError(err.message || "Couldn't generate a summary for that video.");
    } finally {
      setLoading(false);
    }
  }

  function handleStartOver() {
    setUrl("");
    setStyle(null);
    setDeliveryMethod("screen");
    setData(null);
    setError(null);
    setStep("home");
  }

  return (
    <div className="app-shell">
      <div className="app-header">
        <span className="rec-dot" />
        <span className="app-title">
          <strong>REC</strong> · YouTube AI Summarizer
        </span>
      </div>

      <Scrubber currentStep={step} />

      {step === "home" && <HomeScreen onSubmit={handleHomeSubmit} />}

      {step === "style" && (
        <StyleSelector onBack={() => setStep("home")} onSubmit={handleStyleSubmit} />
      )}

      {step === "delivery" && (
        <DeliverySelector onBack={() => setStep("style")} onSubmit={handleDeliverySubmit} />
      )}

      {step === "result" && (
        <ResultScreen
          loading={loading}
          error={error}
          data={data}
          deliveryMethod={deliveryMethod}
          onBack={() => setStep("delivery")}
          onStartOver={handleStartOver}
        />
      )}
    </div>
  );
}
