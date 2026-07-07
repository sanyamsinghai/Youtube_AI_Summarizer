const STEPS = [
  { key: "home", code: "00:00", label: "Paste" },
  { key: "style", code: "00:15", label: "Style" },
  { key: "delivery", code: "00:30", label: "Delivery" },
  { key: "result", code: "00:45", label: "Summary" },
];

// A film scrubber instead of numbered circles: this app's whole job
// is turning a video's timeline into text, so the step indicator
// borrows the vocabulary of the thing it's summarizing.
export default function Scrubber({ currentStep }) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);
  const fillPercent = (currentIndex / (STEPS.length - 1)) * 100;

  return (
    <div className="scrubber">
      <div className="scrubber-track">
        <div className="scrubber-fill" style={{ width: `${fillPercent}%` }} />
        <div className="scrubber-playhead" style={{ left: `${fillPercent}%` }} />
      </div>
      <div className="scrubber-marks">
        {STEPS.map((step, i) => {
          const state = i < currentIndex ? "done" : i === currentIndex ? "active" : "";
          return (
            <div key={step.key} className={`scrubber-mark ${state}`}>
              <span>{step.code}</span>
              <span className="label">{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
