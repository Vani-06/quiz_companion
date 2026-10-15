import { useCallback, useEffect, useState } from "react";
import { FolderTree, Plus, Trash2 } from "lucide-react";
import { api } from "../services/api";
import { EmptyState, ErrorBanner, PageHeader } from "../components/common";

export default function Topics() {
  const [topics, setTopics] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", description: "", parent_topic_id: "" });

  const load = useCallback(async () => {
    try {
      setTopics(await api.getTopics());
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setError("");
      await api.addTopic(form);
      setForm({ name: "", description: "", parent_topic_id: "" });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(topic) {
    if (!window.confirm(`Delete topic "${topic.name}"?`)) return;
    try {
      setError("");
      await api.deleteTopic(topic.topic_id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={<><FolderTree size={14} /> TOPICS</>}
        title="Topic hierarchy"
        subtitle="Parent and child topics stored in the topic table (self-referencing foreign key)."
      />
      <ErrorBanner message={error} onClose={() => setError("")} />

      <section className="two-column">
        <div className="panel glass-panel">
          <h2 className="panel-title">All topics ({topics.length})</h2>
          {topics.length === 0 ? (
            <EmptyState title="No topics" />
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th><th>Name</th><th>Parent</th><th>Items</th><th />
                  </tr>
                </thead>
                <tbody>
                  {topics.map((topic) => (
                    <tr key={topic.topic_id}>
                      <td>{topic.topic_id}</td>
                      <td>
                        <strong>{topic.name}</strong>
                        <div className="cell-note">{topic.description}</div>
                      </td>
                      <td>{topic.parent_name ?? "-"}</td>
                      <td>{topic.item_count}</td>
                      <td>
                        <button type="button" className="icon-button"
                          aria-label={`Delete ${topic.name}`}
                          onClick={() => handleDelete(topic)}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <form className="panel glass-panel form-panel" onSubmit={handleSubmit}>
          <h2 className="panel-title">Add a topic</h2>
          <label>
            Name
            <input required maxLength={80} value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label>
            Description
            <textarea rows={3} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
          <label>
            Parent topic
            <select value={form.parent_topic_id}
              onChange={(e) => setForm({ ...form, parent_topic_id: e.target.value })}>
              <option value="">None (top level)</option>
              {topics.map((topic) => (
                <option key={topic.topic_id} value={topic.topic_id}>{topic.name}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="primary-button">
            <Plus size={16} /> Add topic
          </button>
        </form>
      </section>
    </>
  );
}
