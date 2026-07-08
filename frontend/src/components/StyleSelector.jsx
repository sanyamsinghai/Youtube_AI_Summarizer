import { useState } from "react";

const STYLES = [
  { key: "bullets", name: "Bullet Points", desc: "Quick read, straight to the point." },
  { key: "brief", name: "Executive Brief", desc: "Professional, high-level framing." },
  { key: "student_notes", name: "Student Notes", desc: "Detailed, good for studying." },
  { key: "narrative", name: "Narrative Recap", desc: "Told as a story, easy to follow." },
  { key: "action_items", name: "Action Items", desc: "Task-focused, what to actually do." },
];

export default function StyleSelector({ initialStyle = null, onBack, onSubmit }) {
  const [selected, setSelected] = useState(initialStyle);

  return (
    <div className="panel">
      <span className="eyebrow">Step 2</span>
      <h1>Choose a summary style</h1>
      <p className="subtext">Pick the format that fits how you'll use this.</p>

      <div className="option-grid">
        {STYLES.map((style) => (
          <button
            type="button"
            key={style.key}
            className={`option-card ${selected === style.key ? "selected" : ""}`}
            onClick={() => setSelected(style.key)}
          >
            <span className="tag">{style.key.replace("_", " ")}</span>
            <div className="name">{style.name}</div>
            <div className="desc">{style.desc}</div>
          </button>
        ))}
      </div>

      <div className="btn-row">
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          ← Back
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!selected}
          onClick={() => onSubmit(selected)}
        >
          Get my summary →
        </button>
      </div>
    </div>
  );
}
