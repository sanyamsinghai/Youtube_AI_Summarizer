import { useState, useRef, useEffect } from "react";
import { sendChatMessage } from "../api/client.js";

const BotIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="10" rx="2" />
    <circle cx="12" cy="5" r="2" />
    <line x1="12" y1="7" x2="12" y2="11" />
    <line x1="8" y1="16" x2="8" y2="16" strokeWidth="3" strokeLinecap="round" />
    <line x1="12" y1="16" x2="12" y2="16" strokeWidth="3" strokeLinecap="round" />
    <line x1="16" y1="16" x2="16" y2="16" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

export default function ChatWidget({ videoId }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm RECAP AI 👋 Ask me anything about this video — I can explain concepts, go deeper on topics, or answer follow-up questions.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  // Focus input when chat opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  async function handleSend(e) {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg = { role: "user", content: trimmed };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    // Build history to send (exclude the opening assistant greeting)
    const history = nextMessages
      .slice(1) // skip the initial greeting
      .slice(-10) // max 10 turns
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const { reply } = await sendChatMessage({
        videoId,
        message: trimmed,
        history: history.slice(0, -1), // history doesn't include current message
      });
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ ${err.message || "Something went wrong. Please try again."}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="chat-widget-root">
      {/* Expanded Chat Panel */}
      {open && (
        <div className="chat-panel">
          {/* Header */}
          <div className="chat-panel-header">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div className="chat-avatar-dot" />
              <div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--ink)" }}>RECAP AI</div>
                <div style={{ fontSize: "10.5px", color: "var(--ink-dim)" }}>Ask about this video</div>
              </div>
            </div>
            <button
              className="chat-close-btn"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`chat-bubble ${msg.role === "user" ? "chat-bubble-user" : "chat-bubble-bot"}`}
              >
                {msg.content}
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="chat-bubble chat-bubble-bot chat-typing">
                <span /><span /><span />
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form className="chat-input-row" onSubmit={handleSend}>
            <textarea
              ref={inputRef}
              className="chat-input"
              placeholder="Ask a follow-up question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={loading}
            />
            <button
              type="submit"
              className="chat-send-btn"
              disabled={loading || !input.trim()}
              aria-label="Send"
            >
              <SendIcon />
            </button>
          </form>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        className={`chat-fab ${open ? "chat-fab-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Ask RECAP AI"}
        title="Ask RECAP AI"
      >
        {open ? (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <BotIcon />
        )}
        {!open && <span className="chat-fab-label">Ask AI</span>}
      </button>
    </div>
  );
}
