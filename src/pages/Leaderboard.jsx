import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { api } from "../services/api";
import { EmptyState, ErrorBanner, PageHeader } from "../components/common";

const STRENGTH_CLASS = { Strong: "strong", Average: "average", Weak: "weak" };

export default function Leaderboard({ userId }) {
  const [board, setBoard] = useState(null);
  const [strengths, setStrengths] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.getLeaderboard(), api.getStrengths(userId)])
      .then(([rows, topics]) => {
        setBoard(rows);
        setStrengths(topics);
      })
      .catch((err) => setError(err.message));
  }, [userId]);

  return (
    <>
      <PageHeader
        eyebrow={<><Trophy size={14} /> LEADERBOARD</>}
        title="Leaderboard"
        subtitle="Total of each student's best score per item (v_leaderboard)."
      />
      <ErrorBanner message={error} onClose={() => setError("")} />

      <section className="two-column">
        <div className="panel glass-panel">
          <h2 className="panel-title">Rankings</h2>
          {board === null ? null : board.length === 0 ? (
            <EmptyState title="No scored attempts yet" />
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>Rank</th><th>Student</th><th>Total score</th></tr>
                </thead>
                <tbody>
                  {board.map((row) => (
                    <tr key={row.user_id}
                      className={row.user_id === userId ? "row-highlight" : ""}>
                      <td><span className="rank-badge">{row.rank}</span></td>
                      <td><strong>{row.full_name}</strong></td>
                      <td>{row.total_score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="panel glass-panel">
          <h2 className="panel-title">Your topic strengths</h2>
          {strengths.length === 0 ? (
            <EmptyState title="No topics yet" text="Take a quiz to see your strengths." />
          ) : (
            <div className="strength-list">
              {strengths.map((row) => (
                <div className="strength-row" key={row.topic_id}>
                  <span>{row.topic}</span>
                  <span className="item-meta">{row.proficiency_score}%</span>
                  <span className={`strength-badge ${STRENGTH_CLASS[row.strength]}`}>
                    {row.strength}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
