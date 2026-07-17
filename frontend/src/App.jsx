import { useState, useEffect } from "react";
import { HashRouter, Routes, Route, NavLink, Link } from "react-router-dom";
import SummarizerPage from "./pages/SummarizerPage.jsx";
import FeaturesPage from "./pages/FeaturesPage.jsx";

export default function App() {
  const [theme, setTheme] = useState("dark");

  // Load and apply theme from LocalStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "dark";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
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
            <div className="profile-placeholder" aria-hidden="true" title="Profile (Placeholder)">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
          </div>
        </div>

        <Routes>
          <Route path="/" element={<SummarizerPage />} />
          <Route path="/features" element={<FeaturesPage />} />
        </Routes>
      </div>
    </HashRouter>
  );
}
