import { useCallback, useEffect, useState } from "react";
import { BookOpen, Upload } from "lucide-react";
import { api } from "../services/api";
import { EmptyState, ErrorBanner, PageHeader } from "../components/common";
import { formatDate } from "../utils";

export default function MyLearning({ userId }) {
  const [records, setRecords] = useState(null);
  const [projects, setProjects] = useState([]);
  const [submission, setSubmission] = useState({ projectId: "", score: "" });
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [recordRows, projectRows] = await Promise.all([
        api.getRecords(userId),
        api.getItems("PROJECT"),
      ]);
      setRecords(recordRows);
      setProjects(projectRows);
    } catch (err) {
      setError(err.message);
    }
  }, [userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setError("");
      const { attempt_no } = await api.submitProject(
        submission.projectId,
        userId,
        submission.score
      );
      setNotice(`Project submitted as attempt ${attempt_no}.`);
      setSubmission({ projectId: "", score: "" });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={<><BookOpen size={14} /> MY LEARNING</>}
        title="Attempt history"
        subtitle="Every attempt is a row in learning_record, keyed by user, item and attempt number."
      />
      <ErrorBanner message={error} onClose={() => setError("")} />
      {notice && <div className="notice-banner">{notice}</div>}

      <section className="two-column">
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
                      <td>{row.score === null ? "-" : `${row.score}%`}</td>
                      <td>{formatDate(row.started_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <form className="panel glass-panel form-panel" onSubmit={handleSubmit}>
          <h2 className="panel-title">Submit a project</h2>
          <label>
            Project
            <select required value={submission.projectId}
              onChange={(e) => setSubmission({ ...submission, projectId: e.target.value })}>
              <option value="">Select a project</option>
              {projects.map((project) => (
                <option key={project.item_id} value={project.item_id}>{project.title}</option>
              ))}
            </select>
          </label>
          <label>
            Score (optional, 0-100)
            <input type="number" min={0} max={100} step="0.01" value={submission.score}
              onChange={(e) => setSubmission({ ...submission, score: e.target.value })} />
          </label>
          <button type="submit" className="primary-button">
            <Upload size={16} /> Submit project
          </button>
        </form>
      </section>
    </>
  );
}
