import { useState } from "react";

// We only capture the *method* here. The actual email address is
// requested on the result screen, after the summary exists — per
// spec, so a slow/failed summarize doesn't strand someone who
// already typed their email.
const OPTIONS = [
  { key: "screen", name: "On screen", desc: "Just show it here, no delivery." },
  { key: "email", name: "Email", desc: "Send a formatted copy to an inbox." },
];

export default function DeliverySelector({ onBack, onSubmit }) {
  const [selected, setSelected] = useState("screen");

  return (
    <div className="panel">
      <span className="eyebrow">Step 3</span>
      <h1>How should we deliver it?</h1>
      <p className="subtext">You can always read it here either way.</p>

      <div className="option-grid">
        {OPTIONS.map((opt) => (
          <button
            type="button"
            key={opt.key}
            className={`option-card ${selected === opt.key ? "selected" : ""}`}
            onClick={() => setSelected(opt.key)}
          >
            <span className="tag">{opt.key}</span>
            <div className="name">{opt.name}</div>
            <div className="desc">{opt.desc}</div>
          </button>
        ))}
      </div>

      <div className="btn-row">
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          ← Back
        </button>
        <button type="button" className="btn btn-primary" onClick={() => onSubmit(selected)}>
          Get my summary →
        </button>
      </div>
    </div>
  );
}
