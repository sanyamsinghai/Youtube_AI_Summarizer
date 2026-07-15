import { useState, useEffect } from "react";
import {
  subscribeToChannel,
  getChannels,
  unsubscribeChannel,
  getChannelVideos,
  lookupChannel,
  getVideosByPlaylist,
  getGrowthByInfo,
  getChannelGrowth,
  summarizeVideo,
} from "../api/client.js";
import StyleSelector from "../components/StyleSelector.jsx";
import ResultScreen from "../components/ResultScreen.jsx";

// Helper to format counts beautifully (e.g., 1250000 -> 1.3M)
function formatCount(num) {
  if (num === null || num === undefined) return "0";
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return num.toString();
}

// Custom Premium SVG Line Chart
function GrowthChart({ data }) {
  if (!data || data.length === 0) return null;

  const width = 600;
  const height = 180;
  const paddingLeft = 55;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const subs = data.map((d) => d.subscribers);
  const minSub = Math.min(...subs) * 0.99;
  const maxSub = Math.max(...subs) * 1.01;
  const subRange = maxSub - minSub || 1;

  // Map coordinates
  const points = data.map((d, index) => {
    const x = paddingLeft + (index / (data.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - ((d.subscribers - minSub) / subRange) * chartHeight;
    return { x, y, ...d };
  });

  // SVG path definitions
  const pathD = points.reduce((acc, p, index) => {
    return index === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, "");

  const fillD = pathD
    ? `${pathD} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`
    : "";

  const ticks = 3;
  const yTicks = Array.from({ length: ticks }, (_, i) => {
    const val = minSub + (i / (ticks - 1)) * subRange;
    const y = paddingTop + chartHeight - (i / (ticks - 1)) * chartHeight;
    return { val, y };
  });

  return (
    <div className="growth-chart-box">
      <div className="chart-header">
        <div>
          <h3>Subscriber Growth Trend</h3>
          <p className="chart-desc">Simulated & logged tracking details (6 Months)</p>
        </div>
        <span className="badge-period" style={{ background: "var(--ink)", color: "var(--bg)" }}>
          Total Viewers: {formatCount(data[data.length - 1]?.views || 0)}
        </span>
      </div>
      <div className="svg-container">
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%">
          <defs>
            <linearGradient id="chartFillGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--ink)" stopOpacity="0.10" />
              <stop offset="100%" stopColor="var(--ink)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {yTicks.map((t, idx) => (
            <line
              key={idx}
              x1={paddingLeft}
              y1={t.y}
              x2={width - paddingRight}
              y2={t.y}
              stroke="var(--border)"
              strokeWidth="0.75"
              strokeDasharray="3 3"
            />
          ))}

          {/* Fill under line */}
          {fillD && <path d={fillD} fill="url(#chartFillGradient)" />}

          {/* Line path */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="var(--ink)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Connection dots */}
          {points.map((p, idx) => (
            <g key={idx} className="chart-dot-node">
              <circle
                cx={p.x}
                cy={p.y}
                r="3.5"
                fill="var(--ink)"
                stroke="#ffffff"
                strokeWidth="1"
              />
              <text
                x={p.x}
                y={p.y - 7}
                textAnchor="middle"
                fontSize="8"
                fontFamily="var(--font-mono)"
                fill="var(--ink-dim)"
                fontWeight="bold"
              >
                {formatCount(p.subscribers)}
              </text>
            </g>
          ))}

          {/* Y-Axis scale */}
          {yTicks.map((t, idx) => (
            <text
              key={idx}
              x={paddingLeft - 8}
              y={t.y + 3}
              textAnchor="end"
              fontSize="8.5"
              fontFamily="var(--font-mono)"
              fill="var(--ink-faint)"
            >
              {formatCount(t.val)}
            </text>
          ))}

          {/* X-Axis scale */}
          {points.map((p, idx) => (
            <text
              key={idx}
              x={p.x}
              y={height - 8}
              textAnchor="middle"
              fontSize="8.5"
              fontFamily="var(--font-body)"
              fill="var(--ink-faint)"
            >
              {p.date.split(" ")[0]}
            </text>
          ))}

          {/* Base bottom border axis */}
          <line
            x1={paddingLeft}
            y1={height - paddingBottom}
            x2={width - paddingRight}
            y2={height - paddingBottom}
            stroke="var(--border-strong)"
            strokeWidth="1.25"
          />
        </svg>
      </div>
    </div>
  );
}

export default function FeaturesPage() {
  // Subscribed channels list
  const [channels, setChannels] = useState([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [channelsError, setChannelsError] = useState(null);

  // Search input and result states
  const [searchUrl, setSearchUrl] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);

  // Subscription action states
  const [subscribing, setSubscribing] = useState(false);
  const [subscribingError, setSubscribingError] = useState(null);

  // Dashboard Active State
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [videos, setVideos] = useState([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [videosError, setVideosError] = useState(null);

  // Growth Trend data points
  const [growthData, setGrowthData] = useState([]);
  const [growthLoading, setGrowthLoading] = useState(false);
  const [growthError, setGrowthError] = useState(null);

  // Tab filtering & local search
  const [videoTab, setVideoTab] = useState("recent");
  const [searchQuery, setSearchQuery] = useState("");

  // Inline glassmorphic modal states for direct summaries
  const [activeSummaryVideo, setActiveSummaryVideo] = useState(null); // { video_id, title, thumbnail_url }
  const [modalStep, setModalStep] = useState("style"); // style | result
  const [modalStyle, setModalStyle] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [modalData, setModalData] = useState(null);

  // Load subscriptions grid
  useEffect(() => {
    fetchChannels();
  }, []);

  async function fetchChannels() {
    setChannelsLoading(true);
    setChannelsError(null);
    try {
      const data = await getChannels();
      setChannels(data);
    } catch (err) {
      setChannelsError(err.message || "Failed to load subscribed channels.");
    } finally {
      setChannelsLoading(false);
    }
  }

  // Previews channel info dynamically, BEFORE subscribing
  async function handleSearch(e) {
    e.preventDefault();
    if (!searchUrl.trim()) return;

    setSearchLoading(true);
    setSearchError(null);
    setSelectedChannel(null);
    setVideos([]);
    setGrowthData([]);
    setVideoTab("recent");

    try {
      // 1. Resolve channel metadata
      const resolvedChannel = await lookupChannel(searchUrl.trim());
      setSelectedChannel(resolvedChannel);

      // 2. Load latest videos from playlist
      setVideosLoading(true);
      setVideosError(null);
      try {
        const videosData = await getVideosByPlaylist(resolvedChannel.uploads_playlist_id);
        setVideos(videosData);
      } catch (err) {
        setVideosError(err.message || "Failed to load channel uploads feed.");
      } finally {
        setVideosLoading(false);
      }

      // 3. Load growth chart details
      setGrowthLoading(true);
      setGrowthError(null);
      try {
        const growth = await getGrowthByInfo(resolvedChannel.id, resolvedChannel.subscriber_count);
        setGrowthData(growth);
      } catch (err) {
        setGrowthError(err.message || "Failed to load growth chart values.");
      } finally {
        setGrowthLoading(false);
      }

      setSearchUrl("");
    } catch (err) {
      setSearchError(err.message || "Could not find a YouTube channel matching that query.");
    } finally {
      setSearchLoading(false);
    }
  }

  // Subscribes (saves) the active channel to DB
  async function handleSubscribeActiveChannel() {
    if (!selectedChannel) return;

    setSubscribing(true);
    setSubscribingError(null);
    try {
      const subscribed = await subscribeToChannel(selectedChannel.id);
      
      // Add to list if not already there
      setChannels((prev) => {
        if (prev.some((c) => c.id === subscribed.id)) return prev;
        return [subscribed, ...prev];
      });
    } catch (err) {
      setSubscribingError(err.message || "Failed to subscribe to channel.");
    } finally {
      setSubscribing(false);
    }
  }

  async function handleUnsubscribe(e, channelId) {
    e.stopPropagation();
    if (!confirm("Are you sure you want to unsubscribe from this channel?")) return;

    try {
      await unsubscribeChannel(channelId);
      setChannels((prev) => prev.filter((c) => c.id !== channelId));
      if (selectedChannel?.id === channelId) {
        // Just update sub badge status
        setSelectedChannel(prev => prev ? { ...prev } : null);
      }
    } catch (err) {
      alert(err.message || "Failed to unsubscribe.");
    }
  }

  // Load a subscribed channel details from the grid
  async function handleSelectSubscribedChannel(channel) {
    setSelectedChannel(channel);
    setVideos([]);
    setGrowthData([]);
    setVideoTab("recent");

    // Fetch videos
    setVideosLoading(true);
    setVideosError(null);
    try {
      const data = await getChannelVideos(channel.id);
      setVideos(data);
    } catch (err) {
      setVideosError(err.message || "Failed to load channel videos.");
    } finally {
      setVideosLoading(false);
    }

    // Fetch growth
    setGrowthLoading(true);
    setGrowthError(null);
    try {
      const data = await getChannelGrowth(channel.id);
      setGrowthData(data);
    } catch (err) {
      setGrowthError(err.message || "Failed to load growth trend details.");
    } finally {
      setGrowthLoading(false);
    }
  }

  // Open inline summarizer modal
  function handleOpenModal(video) {
    setActiveSummaryVideo(video);
    setModalStep("style");
    setModalStyle(null);
    setModalLoading(false);
    setModalError(null);
    setModalData(null);
  }

  function handleCloseModal() {
    setActiveSummaryVideo(null);
  }

  // Trigger inline summary pipeline fetch
  async function handleModalStyleSubmit(selectedStyle) {
    setModalStyle(selectedStyle);
    setModalStep("result");
    setModalLoading(true);
    setModalError(null);
    setModalData(null);

    try {
      const result = await summarizeVideo({
        url: `https://www.youtube.com/watch?v=${activeSummaryVideo.video_id}`,
        style: selectedStyle,
      });
      setModalData(result);
    } catch (err) {
      setModalError(err.message || "Couldn't generate a summary for that video.");
    } finally {
      setModalLoading(false);
    }
  }

  // Local sidebar channel filter
  const filteredChannels = channels.filter((ch) =>
    ch.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Tab sort
  const displayedVideos = [...videos];
  if (videoTab === "top") {
    displayedVideos.sort((a, b) => b.views - a.views);
  }

  // Check if selected channel is subscribed
  const isSubscribed = selectedChannel && channels.some((c) => c.id === selectedChannel.id);

  return (
    <>
      <div className="explorer-layout">
      {/* LEFT COLUMN: Sticky / Clean Sidebar Column */}
      <div className="sidebar-column" style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%" }}>
        {/* Search Input Panel */}
        <form onSubmit={handleSearch} className="panel subscription-form" style={{ margin: 0 }}>
          <label htmlFor="channel-search-input" style={{ fontWeight: 600, fontSize: "13.5px", marginBottom: "10px", display: "block" }}>
            Search YouTube Channel
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <input
              id="channel-search-input"
              type="text"
              placeholder="Channel Name or URL"
              value={searchUrl}
              onChange={(e) => setSearchUrl(e.target.value)}
              disabled={searchLoading}
              required
              style={{ fontSize: "12.5px", padding: "10px 12px" }}
            />
            <button type="submit" className="btn btn-primary" disabled={searchLoading} style={{ width: "100%", padding: "10px", fontSize: "12.5px" }}>
              {searchLoading ? "Searching..." : "Search"}
            </button>
          </div>
          {searchError && <p className="error-text" style={{ fontSize: "11.5px" }}>{searchError}</p>}
        </form>

        {/* Subscriptions Panel */}
        <div className="panel" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <h3 style={{ margin: 0, fontSize: "14.5px", fontWeight: 700 }}>My Subscriptions</h3>
          {channels.length > 0 && (
            <input
              type="text"
              placeholder="🔍 Filter subscriptions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: "8px 10px", fontSize: "12px", height: "32px", width: "100%" }}
            />
          )}

          {channelsLoading && (
            <p className="loading-line" style={{ fontSize: "11.5px" }}>
              <span className="spinner spinner-sm" /> Loading…
            </p>
          )}

          {channelsError && (
            <div className="error-box">
              <p className="error-text" style={{ fontSize: "11.5px" }}>{channelsError}</p>
            </div>
          )}

          {!channelsLoading && !channelsError && channels.length === 0 && (
            <p className="empty-state" style={{ fontSize: "11.5px" }}>No subscriptions yet.</p>
          )}

          {!channelsLoading && !channelsError && channels.length > 0 && filteredChannels.length === 0 && (
            <p className="empty-state" style={{ fontSize: "11.5px" }}>No matches.</p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "350px", overflowY: "auto" }}>
            {filteredChannels.map((ch) => (
              <div
                key={ch.id}
                className={`channel-sidebar-item ${selectedChannel?.id === ch.id ? "selected" : ""}`}
                onClick={() => handleSelectSubscribedChannel(ch)}
              >
                <img
                  src={ch.thumbnail_url || "/default-avatar.png"}
                  alt=""
                  style={{ width: "26px", height: "26px", borderRadius: "50%" }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {ch.name}
                  </div>
                  {ch.subscriber_count !== null && (
                    <div style={{ fontSize: "10.5px", color: "var(--ink-dim)" }}>
                      {formatCount(ch.subscriber_count)} subs
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => handleUnsubscribe(e, ch.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--ink-faint)",
                    cursor: "pointer",
                    fontSize: "11px",
                    padding: "4px"
                  }}
                  title="Unsubscribe"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Active Dashboard Details Column */}
      <div className="dashboard-column" style={{ flex: 1, width: "100%" }}>
        {!selectedChannel ? (
          <div className="panel" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "350px", color: "var(--ink-dim)", textAlign: "center" }}>
            <span style={{ fontSize: "42px", marginBottom: "14px" }}>📡</span>
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "var(--ink)" }}>No Channel Selected</h3>
            <p style={{ fontSize: "13px", marginTop: "6px", maxWidth: "280px", color: "var(--ink-faint)" }}>
              Search for any channel on the sidebar or click a subscribed channel to explore its video list.
            </p>
          </div>
        ) : (
          <div className="panel dashboard-panel" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Header info row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <img
                  src={selectedChannel.thumbnail_url}
                  alt=""
                  style={{ width: "40px", height: "40px", borderRadius: "50%", border: "1px solid var(--border-strong)" }}
                />
                <div>
                  <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700 }}>{selectedChannel.name}</h2>
                  <div style={{ display: "flex", gap: "10px", fontSize: "11px", color: "var(--ink-dim)", marginTop: "2px" }}>
                    {selectedChannel.subscriber_count !== null && (
                      <span>📈 <strong>{formatCount(selectedChannel.subscriber_count)}</strong> Subscribers</span>
                    )}
                    {selectedChannel.video_count !== null && (
                      <span>🎥 <strong>{selectedChannel.video_count}</strong> Uploads</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Subscribe button */}
              <div>
                {isSubscribed ? (
                  <span className="subscribed-badge" style={{ fontSize: "11.5px", padding: "5px 10px", border: "1px solid var(--border-strong)", borderRadius: "6px", background: "var(--bg-subtle)", color: "var(--ink-dim)", fontWeight: 600 }}>
                    ✓ Subscribed
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSubscribeActiveChannel}
                    disabled={subscribing}
                    style={{ padding: "6px 12px", fontSize: "11.5px" }}
                  >
                    {subscribing ? "Subscribing..." : "+ Subscribe"}
                  </button>
                )}
                {subscribingError && <p className="error-text" style={{ fontSize: "10px", margin: "4px 0 0 0" }}>{subscribingError}</p>}
              </div>
            </div>

            {/* Growth chart */}
            {growthLoading && (
              <p className="loading-line">
                <span className="spinner" /> Loading growth details...
              </p>
            )}
            {growthError && <p className="error-text">Failed to fetch growth history: {growthError}</p>}
            {!growthLoading && !growthError && growthData.length > 0 && (
              <GrowthChart data={growthData} />
            )}

            {/* Videos Grid */}
            <div className="section videos-section" style={{ borderTop: "1px solid var(--border)", paddingTop: "20px" }}>
              <div className="tabs-header-row" style={{ marginBottom: "16px" }}>
                <div className="tabs-list">
                  <button
                    type="button"
                    className={`tab-toggle-btn ${videoTab === "recent" ? "active" : ""}`}
                    onClick={() => setVideoTab("recent")}
                  >
                    Recent Uploads
                  </button>
                  <button
                    type="button"
                    className={`tab-toggle-btn ${videoTab === "top" ? "active" : ""}`}
                    onClick={() => setVideoTab("top")}
                  >
                    Top Performing Videos
                  </button>
                </div>
              </div>

              {videosLoading && (
                <p className="loading-line">
                  <span className="spinner" /> Loading videos…
                </p>
              )}

              {videosError && (
                <div className="error-box">
                  <p className="error-text">{videosError}</p>
                </div>
              )}

              {!videosLoading && !videosError && displayedVideos.length === 0 && (
                <p className="empty-state">No uploads found.</p>
              )}

              <div className="videos-grid">
                {displayedVideos.map((vid) => (
                  <div key={vid.video_id} className="video-grid-card">
                    <div className="video-grid-thumbnail-wrapper">
                      <a
                        href={`https://www.youtube.com/watch?v=${vid.video_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          src={vid.thumbnail_url}
                          alt=""
                          className="video-grid-thumbnail"
                        />
                      </a>
                      {vid.duration && (
                        <span className="duration-badge">{vid.duration}</span>
                      )}
                    </div>
                    <div className="video-grid-card-content">
                      <h4 className="video-grid-title">
                        <a
                          href={`https://www.youtube.com/watch?v=${vid.video_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="video-grid-title-link"
                        >
                          {vid.title}
                        </a>
                      </h4>
                      <div className="video-grid-stats">
                        <span>👁️ {formatCount(vid.views)}</span>
                        <span>👍 {formatCount(vid.likes)}</span>
                        <span>💬 {formatCount(vid.comments_count)}</span>
                      </div>
                      {vid.published_at && (
                        <div className="video-grid-date">
                          📅 {new Date(vid.published_at).toLocaleDateString()}
                        </div>
                      )}
                      <button
                        type="button"
                        className="btn btn-primary video-grid-action-btn"
                        onClick={() => handleOpenModal(vid)}
                      >
                        ✨ Summarize
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* GLASSMORPHIC INLINE SUMMARIZER DIALOG MODAL */}
      {activeSummaryVideo && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) handleCloseModal(); }}>
          <div className="modal-content-wrapper">
            <button className="modal-close-btn" onClick={handleCloseModal} aria-label="Close">✕</button>
            
            {modalStep === "style" && (
              <StyleSelector
                initialStyle={modalStyle}
                onBack={handleCloseModal}
                onSubmit={handleModalStyleSubmit}
              />
            )}

            {modalStep === "result" && (
              <ResultScreen
                loading={modalLoading}
                error={modalError}
                data={modalData}
                onBack={() => setModalStep("style")}
                onStartOver={handleCloseModal}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
