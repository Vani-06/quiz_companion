
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  Brain,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Code2,
  Compass,
  Flame,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  Sparkles,
  Target,
  Users,
  X,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion } from "framer-motion";
import { getDashboardData } from "./services/api";
import "./App.css";

const skills = [
  {
    id: 1,
    name: "Python Programming",
    description: "Learn programming, automation, and problem-solving.",
    category: "Technology",
  },
  {
    id: 2,
    name: "Web Development",
    description: "Build websites using HTML, CSS, JavaScript, and React.",
    category: "Technology",
  },
  {
    id: 3,
    name: "Artificial Intelligence",
    description: "Explore machine learning and AI fundamentals.",
    category: "Technology",
  },
  {
    id: 4,
    name: "Guitar",
    description:
      "Develop your musical skills, from basics to advanced techniques.",
    category: "Music",
  },
  {
    id: 5,
    name: "Public Speaking",
    description:
      "Improve confidence, presentations, and communication.",
    category: "Communication",
  },
  {
    id: 6,
    name: "Photography",
    description:
      "Learn composition, lighting, and visual storytelling.",
    category: "Creative",
  },
];

const categories = [
  "All",
  "Technology",
  "Music",
  "Communication",
  "Creative",
];

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Explore Skills", icon: Compass },
  { label: "My Learning", icon: BookOpen },
  { label: "Quizzes", icon: Brain },
];

const iconMap = {
  code: Code2,
  brain: Brain,
};

function SectionHeading({ title, subtitle, action, onAction }) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action && (
        <button className="text-action" onClick={onAction}>
          {action} <ChevronRight size={15} />
        </button>
      )}
    </div>
  );
}

function StatCard({ stat, index }) {
  return (
    <motion.div
      className="stat-card glass-panel"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <div className="stat-top">
        <span className={`stat-icon stat-icon-${index}`}>
          {index === 0 && <BookOpen size={19} />}
          {index === 1 && <Clock3 size={19} />}
          {index === 2 && <Users size={19} />}
          {index === 3 && <Check size={19} />}
        </span>
        <span className="stat-trend">
          <ArrowUpRight size={14} />
          {stat.change}
        </span>
      </div>
      <p className="stat-label">{stat.label}</p>
      <div className="stat-value">{stat.value}</div>
    </motion.div>
  );
}

function App() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [search, setSearch] = useState("");
  const [skillSearch, setSkillSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [completedGoals, setCompletedGoals] = useState([]);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const data = await getDashboardData();

        if (active) {
          setDashboard(data);
        }
      } catch {
        if (active) {
          setError(
            "We couldn't load your dashboard. Please try again."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  const handleNavigation = (label) => {
    setActiveNav(label);
    setShowMobileNav(false);
  };

  const filteredMatches =
    dashboard?.matches.filter((match) => {
      const searchText = search.toLowerCase();

      return (
        match.name.toLowerCase().includes(searchText) ||
        match.skill.toLowerCase().includes(searchText) ||
        match.seeking.toLowerCase().includes(searchText)
      );
    }) ?? [];

  const filteredSkills = skills.filter((skill) => {
    const searchText = skillSearch.trim().toLowerCase();

    const matchesSearch =
      skill.name.toLowerCase().includes(searchText) ||
      skill.description.toLowerCase().includes(searchText) ||
      skill.category.toLowerCase().includes(searchText);

    const matchesCategory =
      selectedCategory === "All" ||
      skill.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-mark">
          <Zap size={28} />
        </div>
        <h2>SkillSync</h2>
        <p>Preparing your learning space...</p>
        <div className="loading-bar">
          <span />
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="app-loading">
        <div className="loading-mark error-mark">
          <CircleHelp size={28} />
        </div>
        <h2>Something went wrong</h2>
        <p>{error || "Dashboard data is unavailable."}</p>
        <button
          className="primary-button"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {showMobileNav && (
        <button
          className="mobile-backdrop"
          aria-label="Close navigation"
          onClick={() => setShowMobileNav(false)}
        />
      )}

      <aside
        className={`sidebar ${showMobileNav ? "sidebar-open" : ""}`}
      >
        <div className="brand">
          <div className="brand-symbol">
            <Zap size={23} fill="currentColor" />
          </div>
          <span>
            Skill<span className="brand-accent">Sync</span>
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
              className={`nav-item ${
                activeNav === label ? "nav-active" : ""
              }`}
              onClick={() => handleNavigation(label)}
            >
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-divider" />

        <div className="workspace-label">PERSONAL</div>

        <nav className="main-navigation">
          <button
            className={`nav-item ${
              activeNav === "Achievements" ? "nav-active" : ""
            }`}
            onClick={() => handleNavigation("Achievements")}
          >
            <Target size={19} />
            <span>Achievements</span>
          </button>

          <button
            className={`nav-item ${
              activeNav === "Settings" ? "nav-active" : ""
            }`}
            onClick={() => handleNavigation("Settings")}
          >
            <Settings size={19} />
            <span>Settings</span>
          </button>
        </nav>

        <div className="sidebar-spacer" />

        <div className="streak-card">
          <div className="streak-icon">
            <Flame size={22} />
          </div>
          <div className="streak-title">You're on a roll!</div>
          <p>
            Keep your momentum going and build a daily learning habit.
          </p>
          <div className="streak-bottom">
            <span>
              <Flame size={14} /> 7-day streak
            </span>
            <Sparkles size={16} />
          </div>
        </div>

        <button
          className="sidebar-help"
          onClick={() => handleNavigation("Help & Support")}
        >
          <CircleHelp size={18} />
          <span>Help & Support</span>
          <ChevronRight size={15} />
        </button>

        <div className="sidebar-footer">
          <div className="avatar avatar-small">CK</div>
          <div className="sidebar-user">
            <strong>{dashboard.user.name}</strong>
            <span>{dashboard.user.role}</span>
          </div>
          <button
            className="icon-button"
            aria-label="Open profile menu"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            <ChevronDown size={17} />
          </button>

          {showProfileMenu && (
            <div className="profile-popover">
              <button
                onClick={() => handleNavigation("Settings")}
              >
                <Settings size={16} /> Profile settings
              </button>
              <button
                onClick={() => handleNavigation("Help & Support")}
              >
                <LogOut size={16} /> Account options
              </button>
            </div>
          )}
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
            <label className="search-box">
              <Search size={17} />
              <input
                type="search"
                placeholder="Search skills, people..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <kbd>⌘ K</kbd>
            </label>

            <div className="notification-wrapper">
              <button
                className="icon-button notification-button"
                aria-label="Notifications"
                onClick={() =>
                  setShowNotifications(!showNotifications)
                }
              >
                <Bell size={19} />
                <span className="notification-dot" />
              </button>

              {showNotifications && (
                <div className="notification-popover">
                  <div className="popover-heading">
                    <strong>Notifications</strong>
                    <span className="new-label">2 updates</span>
                  </div>

                  <div className="notification-entry">
                    <span className="notification-entry-icon">
                      <Users size={17} />
                    </span>
                    <div>
                      <strong>New skill matches</strong>
                      <p>
                        Discover people who match your learning goals.
                      </p>
                    </div>
                  </div>

                  <div className="notification-entry">
                    <span className="notification-entry-icon mint">
                      <CalendarDays size={17} />
                    </span>
                    <div>
                      <strong>Upcoming session</strong>
                      <p>Your next learning session is coming up.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="topbar-avatar avatar">CK</div>
          </div>
        </header>

        <div className="dashboard-content">
          {activeNav === "Dashboard" ? (
            <>
              <section className="welcome-row">
                <div>
                  <div className="eyebrow">
                    <Sparkles size={14} /> YOUR PERSONAL LEARNING HUB
                  </div>
                  <h1>
                    Let's make progress,{" "}
                    <span>{dashboard.user.name}.</span>
                  </h1>
                  <p className="welcome-subtitle">
                    Every skill you learn opens a new door. Keep going!
                  </p>
                </div>

                <button
                  className="primary-button"
                  onClick={() => handleNavigation("Explore Skills")}
                >
                  <Plus size={17} /> Explore skills
                </button>
              </section>

              <section className="stats-grid">
                {dashboard.stats.map((stat, index) => (
                  <StatCard
                    key={stat.label}
                    stat={stat}
                    index={index}
                  />
                ))}
              </section>

              <section className="middle-grid">
                <div className="panel activity-panel glass-panel">
                  <SectionHeading
                    title="Learning activity"
                    subtitle="Your learning hours throughout the week"
                    action="View report"
                    onAction={() => handleNavigation("My Learning")}
                  />

                  <div className="activity-summary">
                    <div>
                      <span className="summary-number">
                        {dashboard.weeklyActivity.reduce(
                          (total, day) => total + day.hours,
                          0
                        )}
                        <span> hrs</span>
                      </span>
                      <span className="summary-caption">
                        This week
                      </span>
                    </div>

                    <div className="activity-legend">
                      <span className="legend-dot" /> Learning hours
                    </div>
                  </div>

                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={dashboard.weeklyActivity}
                        margin={{
                          top: 12,
                          right: 5,
                          left: -20,
                          bottom: 0,
                        }}
                      >
                        <defs>
                          <linearGradient
                            id="activityGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#9b8cff"
                              stopOpacity={0.35}
                            />
                            <stop
                              offset="95%"
                              stopColor="#9b8cff"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>

                        <CartesianGrid
                          stroke="rgba(255,255,255,0.06)"
                          vertical={false}
                          strokeDasharray="4 5"
                        />

                        <XAxis
                          dataKey="day"
                          axisLine={false}
                          tickLine={false}
                          tick={{
                            fill: "#8e90a8",
                            fontSize: 12,
                          }}
                          dy={10}
                        />

                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{
                            fill: "#777991",
                            fontSize: 11,
                          }}
                          tickFormatter={(value) => `${value}h`}
                        />

                        <Tooltip
                          contentStyle={{
                            background: "#191a2b",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 12,
                            color: "#ffffff",
                          }}
                          labelStyle={{ color: "#b9b4ff" }}
                          formatter={(value) => [
                            `${value} hours`,
                            "Learning",
                          ]}
                        />

                        <Area
                          type="monotone"
                          dataKey="hours"
                          stroke="#a89aff"
                          strokeWidth={2.5}
                          fill="url(#activityGradient)"
                          activeDot={{
                            r: 5,
                            fill: "#a89aff",
                            stroke: "#191a2b",
                            strokeWidth: 3,
                          }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="panel goals-panel glass-panel">
                  <SectionHeading
                    title="Learning goals"
                    subtitle="Small steps, big results"
                    action="All goals"
                    onAction={() => handleNavigation("My Learning")}
                  />

                  <div className="goal-list">
                    {dashboard.goals.map((goal) => {
                      const isComplete = completedGoals.includes(
                        goal.id
                      );

                      return (
                        <div className="goal-item" key={goal.id}>
                          <div className="goal-heading">
                            <span
                              className="goal-indicator"
                              style={{ background: goal.color }}
                            />

                            <span
                              className={
                                isComplete ? "goal-completed" : ""
                              }
                            >
                              {goal.title}
                            </span>

                            <button
                              className={`goal-check ${
                                isComplete ? "goal-check-done" : ""
                              }`}
                              aria-label={
                                isComplete
                                  ? "Mark goal incomplete"
                                  : "Mark goal complete"
                              }
                              onClick={() =>
                                setCompletedGoals((current) =>
                                  isComplete
                                    ? current.filter(
                                        (id) => id !== goal.id
                                      )
                                    : [...current, goal.id]
                                )
                              }
                            >
                              {isComplete ? (
                                <Check size={13} />
                              ) : null}
                            </button>
                          </div>

                          <div className="progress-track">
                            <div
                              className="progress-fill"
                              style={{
                                width: `${
                                  isComplete ? 100 : goal.progress
                                }%`,
                                background: goal.color,
                              }}
                            />
                          </div>

                          <div className="goal-progress-label">
                            <span>
                              {isComplete ? 100 : goal.progress}%
                              complete
                            </span>
                            <span>
                              {isComplete
                                ? "Completed"
                                : "In progress"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    className="add-goal-button"
                    onClick={() => handleNavigation("My Learning")}
                  >
                    <Plus size={16} /> Explore your next goal
                  </button>
                </div>
              </section>

              <section className="bottom-grid">
                <div className="panel matches-panel glass-panel">
                  <SectionHeading
                    title="Your skill matches"
                    subtitle="People you can learn with and learn from"
                    action="Explore all"
                    onAction={() => handleNavigation("Explore Skills")}
                  />

                  <div className="matches-list">
                    {filteredMatches.length > 0 ? (
                      filteredMatches.map((match, index) => (
                        <motion.div
                          className="match-card"
                          key={match.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.06 }}
                        >
                          <div
                            className="match-avatar"
                            style={{
                              "--match-color": match.color,
                            }}
                          >
                            {match.initials}
                            <span className="online-indicator" />
                          </div>

                          <div className="match-info">
                            <strong>{match.name}</strong>
                            <span className="match-skill">
                              {match.skill}
                            </span>
                            <div className="match-exchange">
                              <span>{match.offering}</span>
                              <ArrowDownRight size={13} />
                              <span>{match.seeking}</span>
                            </div>
                          </div>

                          <div className="match-right">
                            <div className="match-score">
                              <Sparkles size={13} />
                              {match.compatibility}%
                            </div>
                            <span>match</span>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="empty-state">
                        <Search size={22} />
                        <strong>No matching people found</strong>
                        <span>Try another name or skill.</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="panel sessions-panel glass-panel">
                  <SectionHeading
                    title="Upcoming sessions"
                    subtitle="Your learning calendar"
                    action="View calendar"
                    onAction={() => handleNavigation("Quizzes")}
                  />

                  <div className="sessions-list">
                    {dashboard.sessions.map((session) => {
                      const SessionIcon =
                        iconMap[session.icon] || BookOpen;

                      return (
                        <div
                          className="session-item"
                          key={session.id}
                        >
                          <div
                            className={`session-icon session-icon-${session.icon}`}
                          >
                            <SessionIcon size={19} />
                          </div>

                          <div className="session-info">
                            <strong>{session.title}</strong>
                            <span>with {session.partner}</span>
                            <div className="session-meta">
                              <span>
                                <CalendarDays size={12} />{" "}
                                {session.date}
                              </span>
                              <span>
                                <Clock3 size={12} /> {session.time}
                              </span>
                            </div>
                          </div>

                          <span className="session-duration">
                            {session.duration}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    className="schedule-button"
                    onClick={() => handleNavigation("Quizzes")}
                  >
                    <Brain size={16} /> Explore quizzes
                    <ChevronRight size={15} />
                  </button>
                </div>
              </section>

              <footer className="dashboard-footer">
                <span>© 2026 SkillSync</span>
                <span>
                  <Activity size={13} /> Your growth, your pace.
                </span>
                <span className="footer-status">
                  <span /> All systems operational
                </span>
              </footer>
            </>
          ) : (
            <section className="placeholder-page glass-panel">
              <div className="placeholder-icon">
                {activeNav === "Quizzes" ? (
                  <Brain size={27} />
                ) : (
                  <Compass size={27} />
                )}
              </div>

              <div className="eyebrow">
                <Sparkles size={14} /> SKILLSYNC WORKSPACE
              </div>

              <h1>{activeNav}</h1>

              {activeNav === "Explore Skills" ? (
                <div className="explore-skills">
                  <p>
                    Discover new skills, explore your interests, and
                    find people to learn from.
                  </p>

                  <div className="skill-search">
                    <Search size={17} />
                    <input
                      type="search"
                      placeholder="Search skills by name or category..."
                      aria-label="Search skills"
                      value={skillSearch}
                      onChange={(event) =>
                        setSkillSearch(event.target.value)
                      }
                    />

                    {skillSearch && (
                      <button
                        type="button"
                        className="icon-button"
                        aria-label="Clear skill search"
                        onClick={() => setSkillSearch("")}
                      >
                        <X size={17} />
                      </button>
                    )}
                  </div>

                  <div className="category-filters">
                    {categories.map((category) => (
                      <button
                        key={category}
                        type="button"
                        className={`category-filter ${
                          selectedCategory === category ? "active" : ""
                        }`}
                        aria-pressed={selectedCategory === category}
                        onClick={() =>
                          setSelectedCategory(category)
                        }
                      >
                        {category}
                      </button>
                    ))}
                  </div>

                  <div className="skill-results-heading">
                    <h2>
                      {selectedCategory === "All"
                        ? "Discover skills"
                        : selectedCategory}
                    </h2>
                    <span>
                      {filteredSkills.length}{" "}
                      {filteredSkills.length === 1 ? "skill" : "skills"}
                    </span>
                  </div>

                  <div className="skill-grid">
                    {filteredSkills.length > 0 ? (
                      filteredSkills.map((skill) => (
                        <article
                          className="skill-card"
                          key={skill.id}
                        >
                          <h3>{skill.name}</h3>
                          <p>{skill.description}</p>
                          <span>{skill.category}</span>
                        </article>
                      ))
                    ) : (
                      <div className="no-skills">
                        <Search size={24} />
                        <h3>No skills found</h3>
                        <p>
                          Try another search or select a different
                          category.
                        </p>
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() => {
                            setSkillSearch("");
                            setSelectedCategory("All");
                          }}
                        >
                          Clear filters
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : activeNav === "Quizzes" ? (
                <>
                  <p>
                    Test your knowledge, practise what you've learned,
                    and track your progress. Interactive quizzes,
                    scoring, and results will be added in a future
                    update.
                  </p>

                  <button
                    className="primary-button"
                    onClick={() => handleNavigation("Dashboard")}
                  >
                    <LayoutDashboard size={17} /> Back to dashboard
                  </button>
                </>
              ) : (
                <>
                  <p>
                    This section is ready for the next stage of
                    development. Your dashboard is working with mock
                    data while the backend is being prepared.
                  </p>

                  <button
                    className="primary-button"
                    onClick={() => handleNavigation("Dashboard")}
                  >
                    <LayoutDashboard size={17} /> Back to dashboard
                  </button>
                </>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
