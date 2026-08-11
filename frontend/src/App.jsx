import { useState, useEffect } from "react";
import { HashRouter, Routes, Route, NavLink, Link } from "react-router-dom";
import SummarizerPage from "./pages/SummarizerPage.jsx";
import FeaturesPage from "./pages/FeaturesPage.jsx";
import HistoryPage from "./pages/HistoryPage.jsx";
import { getCurrentUser, BACKEND_URL } from "./api/client.js";

export default function App() {
  const [theme, setTheme] = useState("dark");
  const [session, setSession] = useState({ logged_in: false });
  const [showMenu, setShowMenu] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Load and apply theme from LocalStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "dark";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  // Fetch active user session status on mount
  useEffect(() => {
    getCurrentUser()
      .then((res) => {
        setSession(res);
      })
      .catch(() => {});
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

  return (
    <HashRouter>
      <div className="app-shell">
        <div className="app-header">
          <div className="header-left">
            {/* Logo link — passes resetToHome flag so SummarizerPage clears the saved result */}
            <Link to="/" state={{ resetToHome: true }} className="app-title-link">
              <span className="app-logo">RECAP</span>
            </Link>
          </div>
          
          <div className="header-center">
            {/* Center-aligned Navigation Bar */}
            <nav className="app-nav-center">
              <NavLink to="/" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                Home
              </NavLink>
              <NavLink to="/features" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                Features
              </NavLink>
            </nav>
          </div>
          
          <div className="header-right">
            {/* Round Theme Toggle Button with Rotate & Scale animations */}
            <button 
              type="button" 
              className={`theme-toggle-btn ${theme === "light" ? "light" : "dark"}`} 
              onClick={toggleTheme}
              aria-label="Toggle Theme"
            >
              <span className="theme-toggle-icon">{theme === "light" ? "🌙" : "☀️"}</span>
            </button>
            
            {session.logged_in ? (
              <div style={{ position: "relative" }}>
                <button 
                  type="button"
                  onClick={() => setShowMenu(!showMenu)}
                  className="user-avatar-btn" 
                  title="Profile Menu" 
                >
                  {(session.name || session.email || "U").charAt(0).toUpperCase()}
                </button>
                {showMenu && (
                  <div className="profile-dropdown-menu">
                    <div className="profile-section-details">
                      <div className="profile-section-name">{session.name || "User"}</div>
                      <div className="profile-section-email">{session.email}</div>
                    </div>
                    
                    <Link 
                      to="/history" 
                      onClick={() => setShowMenu(false)}
                      style={{
                        textDecoration: "none",
                        fontFamily: "inherit",
                        fontSize: "13px",
                        fontWeight: "600",
                        color: "var(--ink)",
                        cursor: "pointer",
                        padding: "8px 10px",
                        borderRadius: "4px",
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        transition: "background 0.15s"
                      }}
                      onMouseEnter={(e) => e.target.style.background = "var(--bg-subtle)"}
                      onMouseLeave={(e) => e.target.style.background = "none"}
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                      Summary History
                    </Link>
                    
                    <a href={BACKEND_URL ? `${BACKEND_URL}/auth/logout` : "/auth/logout"} className="profile-signout-link">
                      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                      </svg>
                      Sign out
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <button 
                type="button"
                onClick={() => setShowAuthModal(true)} 
                className="auth-trigger-btn"
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  border: "1px solid var(--border)",
                  background: "none",
                  color: "var(--ink)",
                  fontSize: "12.5px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "background 0.15s"
                }}
              >
                Sign Up
              </button>
            )}
          </div>
        </div>

        {/* Auth Modal Overlay */}
        {showAuthModal && (
          <div className="auth-modal-overlay" onClick={() => setShowAuthModal(false)}>
            <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
              <button 
                type="button" 
                className="auth-modal-close-btn" 
                onClick={() => setShowAuthModal(false)}
                aria-label="Close Modal"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
              <div className="auth-modal-header">
                <h2 className="auth-modal-title">Sign Up / Sign In</h2>
                <p className="auth-modal-subtitle">
                  Create an account or sign in to save your personal YouTube subscriptions and custom summary feeds.
                </p>
              </div>
              <div className="auth-modal-body">
                <a href={BACKEND_URL ? `${BACKEND_URL}/auth/google/login` : "/auth/google/login"} className="google-signin-btn">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ background: "#fff", borderRadius: "50%", padding: "2px" }}>
                    <path d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.8.54-1.83.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.95v2.33A9 9 0 0 0 9 18z" fill="#34A853"/>
                    <path d="M3.96 10.71A5.4 5.4 0 0 1 3.6 9c0-.59.1-1.17.28-1.71V4.96H.95A9 9 0 0 0 0 9c0 1.45.35 2.82.95 4.04l3.01-2.33z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2.4A9 9 0 0 0 .95 4.96l3.01 2.33C4.67 5.16 6.66 3.58 9 3.58z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </a>
              </div>
            </div>
          </div>
        )}

        <Routes>
          <Route path="/" element={<SummarizerPage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
      </div>
    </HashRouter>
  );
}

