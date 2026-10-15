import { useEffect, useState } from "react";
import {
  BookOpen,
  Brain,
  ChevronRight,
  CircleHelp,
  FolderTree,
  LayoutDashboard,
  Library,
  Menu,
  Zap,
  X,
} from "lucide-react";
import { api } from "./services/api";
import Dashboard from "./pages/Dashboard";
import Topics from "./pages/Topics";
import LearningItems from "./pages/LearningItems";
import Quizzes from "./pages/Quizzes";
import MyLearning from "./pages/MyLearning";
import "./App.css";
import "./pages.css";

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "My Learning", icon: BookOpen },
  { label: "Quizzes", icon: Brain },
  { label: "Learning Items", icon: Library },
  { label: "Topics", icon: FolderTree },
];

const pageFromHash = () => {
  const label = decodeURIComponent(window.location.hash.slice(1));
  return navigation.some((entry) => entry.label === label)
    ? label
    : "Dashboard";
};

const initialsOf = (name) =>
  name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

function App() {
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeNav, setActiveNav] = useState(pageFromHash);
  const [showMobileNav, setShowMobileNav] = useState(false);

  useEffect(() => {
    api
      .getUsers()
      .then((rows) => {
        setUsers(rows);
        setUserId(rows[0]?.user_id ?? null);
      })
      .catch((err) =>
        setError(
          `${err.message}. Is the API running and connected to PostgreSQL?`
        )
      )
      .finally(() => setLoading(false));
  }, []);

  const handleNavigation = (label) => {
    setActiveNav(label);
    history.replaceState(null, "", `#${encodeURIComponent(label)}`);
    setShowMobileNav(false);
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-mark">
          <Zap size={28} />
        </div>
        <h2>Quiz Companion</h2>
        <p>Connecting to the database...</p>
        <div className="loading-bar">
          <span />
        </div>
      </div>
    );
  }

  if (error || userId === null) {
    return (
      <div className="app-loading">
        <div className="loading-mark error-mark">
          <CircleHelp size={28} />
        </div>
        <h2>Something went wrong</h2>
        <p>{error || "No users found. Run npm run db:setup to load sample data."}</p>
        <button
          className="primary-button"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
      </div>
    );
  }

  const currentUser = users.find((user) => user.user_id === userId);

  return (
    <div className="app-shell">
      {showMobileNav && (
        <button
          className="mobile-backdrop"
          aria-label="Close navigation"
          onClick={() => setShowMobileNav(false)}
        />
      )}

      <aside className={`sidebar ${showMobileNav ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-symbol">
            <Zap size={23} fill="currentColor" />
          </div>
          <span>
            Quiz<span className="brand-accent">Companion</span>
          </span>
          <button
            className="icon-button sidebar-close"
            aria-label="Close menu"
            onClick={() => setShowMobileNav(false)}
          >
            <X size={19} />
          </button>
        </div>

        <div className="workspace-label">WORKSPACE</div>

        <nav className="main-navigation">
          {navigation.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${activeNav === label ? "nav-active" : ""}`}
              onClick={() => handleNavigation(label)}
            >
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-spacer" />

        <div className="sidebar-footer">
          <div className="avatar avatar-small">
            {initialsOf(currentUser.full_name)}
          </div>
          <div className="sidebar-user">
            <strong>{currentUser.full_name}</strong>
            <span>{currentUser.skill_level}</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu-button"
              aria-label="Open navigation"
              onClick={() => setShowMobileNav(true)}
            >
              <Menu size={22} />
            </button>

            <div className="breadcrumb">
              <span>Workspace</span>
              <ChevronRight size={14} />
              <strong>{activeNav}</strong>
            </div>
          </div>

          <div className="topbar-actions">
            <label className="user-switcher">
              <span>Student</span>
              <select
                value={userId}
                onChange={(event) => setUserId(Number(event.target.value))}
              >
                {users.map((user) => (
                  <option key={user.user_id} value={user.user_id}>
                    {user.full_name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>

        <div className="dashboard-content">
          {activeNav === "Dashboard" && (
            <Dashboard userId={userId} onNavigate={handleNavigation} />
          )}
          {activeNav === "My Learning" && <MyLearning userId={userId} />}
          {activeNav === "Quizzes" && <Quizzes />}
          {activeNav === "Learning Items" && <LearningItems />}
          {activeNav === "Topics" && <Topics />}
        </div>
      </main>
    </div>
  );
}

export default App;
