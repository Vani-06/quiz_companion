import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { api } from "../services/api";
import { EmptyState, ErrorBanner, PageHeader } from "../components/common";
import { formatDate } from "../utils";

export default function MyLearning({ userId }) {
  const [records, setRecords] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getRecords(userId)
      .then(setRecords)
      .catch((err) => setError(err.message));
  }, [userId]);

  return (
    <>
      <PageHeader
        eyebrow={<><BookOpen size={14} /> MY LEARNING</>}
        title="Attempt history"
        subtitle="Every attempt is a row in learning_record, keyed by user, item and attempt number."
      />
      <ErrorBanner message={error} onClose={() => setError("")} />

      <div className="panel glass-panel">
        {records === null ? null : records.length === 0 ? (
          <EmptyState title="No attempts yet" />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item</th><th>Type</th><th>Topic</th><th>Attempt</th>
                  <th>Status</th><th>Score</th><th>Started</th>
                </tr>
              </thead>
              <tbody>
                {records.map((row) => (
                  <tr key={`${row.item_id}-${row.attempt_no}`}>
                    <td><strong>{row.title}</strong></td>
                    <td>{row.item_type}</td>
                    <td>{row.topic}</td>
                    <td>{row.attempt_no}</td>
                    <td>{row.status}</td>
                    <td>{row.score ?? "-"}%</td>
                    <td>{formatDate(row.started_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
