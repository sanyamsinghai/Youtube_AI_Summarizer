const STEPS = [
  { key: "home", label: "1. Paste Link" },
  { key: "style", label: "2. Choose Style" },
  { key: "delivery", label: "3. Get Summary" },
  { key: "result", label: "4. Send (Optional)" },
];

export default function StepIndicator({ currentStep }) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="steps">
      {STEPS.map((step, i) => {
        const state = i < currentIndex ? "done" : i === currentIndex ? "active" : "";
        return (
          <span key={step.key} className={`step-item ${state}`}>
            {step.label}
          </span>
        );
      })}
    </div>
  );
}
