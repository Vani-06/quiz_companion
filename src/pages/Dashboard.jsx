import { useCallback, useEffect, useState } from "react";
import { Activity, Brain, Check, Code2, Sparkles, Target, X } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion } from "framer-motion";
import { api } from "../services/api";
import {
  EmptyState,
  ErrorBanner,
  PageHeader,
  SectionHeading,
} from "../components/common";
import { formatDate, strengthOf } from "../utils";

const STRENGTH_COLORS = {
  strong: "#43e6c5",
  average: "#ffb86b",
  weak: "#ff7a8a",
};

function StatCard({ label, value, note, index }) {
  return (
    <motion.div
      className="stat-card glass-panel"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <div className="stat-top">
        <span className={`stat-icon stat-icon-${index}`}>
          {index === 0 && <Activity size={19} />}
          {index === 1 && <Target size={19} />}
          {index === 2 && <Brain size={19} />}
          {index === 3 && <Sparkles size={19} />}
        </span>
        <span className="stat-trend">{note}</span>
      </div>
      <p className="stat-label">{label}</p>
      <div className="stat-value">{value}</div>
    </motion.div>
  );
}

export default function Dashboard({ userId, onNavigate }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      setData(await api.getDashboard(userId));
    } catch (err) {
      setError(err.message);
    }
  }, [userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function refreshRecommendations() {
    try {
      setError("");
      const { added, weakTopic, similar } = await api.generateRecommendations(userId);
      setNotice(
        added > 0
          ? `Added ${added} new recommendation${added === 1 ? "" : "s"}: ` +
              `${weakTopic} from weak topics, ${similar} similar to items you found hard.`
          : "No new recommendations right now."
      );
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function changeStatus(itemId, status) {
    try {
      await api.setRecommendationStatus(userId, itemId, status);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!data) {
    return <ErrorBanner message={error || "Loading dashboard..."} />;
  }

  const { user, summary, proficiency, recommendations, recent } = data;
  const firstName = user.full_name.split(" ")[0];

  return (
    <>
      <PageHeader
        eyebrow={
          <>
            <Sparkles size={14} /> YOUR ADAPTIVE LEARNING HUB
          </>
        }
        title={
          <>
            Let's make progress, <span>{firstName}.</span>
          </>
        }
        subtitle={`${user.skill_level} learner · ${user.email}`}
      >
        <button className="primary-button" onClick={() => onNavigate("Quizzes")}>
          <Brain size={17} /> Browse quizzes
        </button>
      </PageHeader>

      <ErrorBanner message={error} onClose={() => setError("")} />

      <section className="stats-grid">
        <StatCard index={0} label="Attempts" value={summary.attempts}
          note={`${summary.items_tried} items tried`} />
        <StatCard index={1} label="Average score" value={`${summary.average_score}%`}
          note={`Best ${summary.best_score}%`} />
        <StatCard index={2} label="Topics tracked" value={summary.topics_tracked}
          note="With proficiency" />
        <StatCard index={3} label="Active recommendations"
          value={summary.active_recommendations} note="For you" />
      </section>

      <section className="middle-grid">
        <div className="panel glass-panel">
          <SectionHeading
            title="Topic proficiency"
            subtitle="Latest score per topic (from topic_proficiency)"
          />
          {proficiency.length === 0 ? (
            <EmptyState title="No proficiency data yet"
              text="Complete a quiz or project to see topic scores." />
          ) : (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={proficiency} margin={{ top: 12, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false}
                    strokeDasharray="4 5" />
                  <XAxis dataKey="topic" axisLine={false} tickLine={false}
                    tick={{ fill: "#8e90a8", fontSize: 12 }} dy={10} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false}
                    tick={{ fill: "#777991", fontSize: 11 }} />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    contentStyle={{ background: "#191a2b",
                      border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }}
                    labelStyle={{ color: "#b9b4ff" }}
                    formatter={(value) => [`${value}%`, "Proficiency"]}
                  />
                  <Bar dataKey="proficiency_score" radius={[8, 8, 0, 0]} maxBarSize={56} isAnimationActive={false}>
                    {proficiency.map((row) => (
                      <Cell key={row.topic_id}
                        fill={STRENGTH_COLORS[strengthOf(row.proficiency_score)]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="panel glass-panel">
          <SectionHeading title="Recent attempts"
            subtitle="From learning_record"
            action="All attempts" onAction={() => onNavigate("My Learning")} />
          <div className="sessions-list">
            {recent.length === 0 ? (
              <EmptyState title="No attempts yet" />
            ) : (
              recent.map((row) => (
                <div className="session-item" key={`${row.item_id}-${row.attempt_no}`}>
                  <div className={`session-icon session-icon-${row.item_type === "QUIZ" ? "brain" : "code"}`}>
                    {row.item_type === "QUIZ" ? <Brain size={19} /> : <Code2 size={19} />}
                  </div>
                  <div className="session-info">
                    <strong>{row.title}</strong>
                    <span>Attempt {row.attempt_no} · {row.status}</span>
                    <div className="session-meta">
                      <span>{formatDate(row.started_at)}</span>
                    </div>
                  </div>
                  <span className="session-duration">{row.score ?? "-"}%</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="panel glass-panel recommendations-panel">
        <SectionHeading title="Recommended for you"
          subtitle="Suggested quizzes and projects, highest rank first"
          action="Refresh recommendations" onAction={refreshRecommendations} />
        {notice && <div className="notice-banner">{notice}</div>}
        <div className="matches-list">
          {recommendations.length === 0 ? (
            <EmptyState title="No recommendations" />
          ) : (
            recommendations.map((rec) => (
              <div className="match-card" key={rec.item_id}>
                <div className="match-avatar" style={{ "--match-color": rec.item_type === "QUIZ" ? "#9b8cff" : "#43e6c5" }}>
                  {rec.item_type === "QUIZ" ? <Brain size={18} /> : <Code2 size={18} />}
                </div>
                <div className="match-info">
                  <strong>{rec.title}</strong>
                  <span className="match-skill">{rec.topic} · difficulty {rec.difficulty}/5</span>
                  <span className="rec-reason">
                    <span className={`rec-source ${rec.source}`}>
                      {rec.source === "similar" ? "Similar" : "Topic"}
                    </span>
                    {rec.reason}
                  </span>
                </div>
                <div className="match-right rec-actions">
                  <div className="match-score">
                    <Sparkles size={13} />
                    {Math.round(rec.rank_score * 100)}%
                  </div>
                  {rec.status === "active" ? (
                    <div className="rec-buttons">
                      <button type="button" className="mini-button done"
                        onClick={() => changeStatus(rec.item_id, "completed")}>
                        <Check size={13} /> Done
                      </button>
                      <button type="button" className="mini-button"
                        onClick={() => changeStatus(rec.item_id, "dismissed")}>
                        <X size={13} /> Dismiss
                      </button>
                    </div>
                  ) : (
                    <button type="button" className="mini-button"
                      onClick={() => changeStatus(rec.item_id, "active")}>
                      {rec.status} · Restore
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}
