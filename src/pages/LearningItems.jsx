import { useCallback, useEffect, useState } from "react";
import { BookOpen, Brain, Code2, Plus, Trash2 } from "lucide-react";
import { api } from "../services/api";
import { EmptyState, ErrorBanner, PageHeader } from "../components/common";

const EMPTY_FORM = {
  item_type: "QUIZ",
  title: "",
  topic_id: "",
  difficulty: 2,
  time_limit_min: 15,
  pass_mark: 60,
  est_hours: 4,
  repo_url: "",
  tech: "",
};

export default function LearningItems() {
  const [items, setItems] = useState([]);
  const [topics, setTopics] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [itemRows, topicRows] = await Promise.all([api.getItems(), api.getTopics()]);
      setItems(itemRows);
      setTopics(topicRows);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const visible = items.filter(
    (item) =>
      (filter === "ALL" || item.item_type === filter) &&
      `${item.title} ${item.topic ?? ""}`.toLowerCase().includes(search.trim().toLowerCase())
  );

  const set = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setError("");
      await api.addItem(form);
      setForm({ ...EMPTY_FORM, item_type: form.item_type });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    try {
      setError("");
      await api.deleteItem(item.item_id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={<><BookOpen size={14} /> LEARNING ITEMS</>}
        title="Quizzes and projects"
        subtitle="learning_item with its quiz / project subclass and project_tech values."
      />
      <ErrorBanner message={error} onClose={() => setError("")} />

      <section className="two-column">
        <div className="panel glass-panel">
          <div className="toolbar">
            <div className="category-filters">
              {["ALL", "QUIZ", "PROJECT"].map((type) => (
                <button key={type} type="button"
                  className={`category-filter ${filter === type ? "active" : ""}`}
                  aria-pressed={filter === type}
                  onClick={() => setFilter(type)}>
                  {type === "ALL" ? "All" : type === "QUIZ" ? "Quizzes" : "Projects"}
                </button>
              ))}
            </div>
            <input className="toolbar-search" type="search" placeholder="Search title or topic..."
              aria-label="Search learning items" value={search}
              onChange={(e) => setSearch(e.target.value)} />
          </div>

          {visible.length === 0 ? (
            <EmptyState title="No learning items found" text="Try another filter or search." />
          ) : (
            <div className="item-grid">
              {visible.map((item) => (
                <article className="item-card" key={item.item_id}>
                  <div className="item-card-top">
                    <span className={`type-badge ${item.item_type.toLowerCase()}`}>
                      {item.item_type === "QUIZ" ? <Brain size={13} /> : <Code2 size={13} />}
                      {item.item_type}
                    </span>
                    <button type="button" className="icon-button"
                      aria-label={`Delete ${item.title}`} onClick={() => handleDelete(item)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <h3>{item.title}</h3>
                  <p className="item-meta">{item.topic ?? "No topic"} · difficulty {item.difficulty}/5</p>
                  {item.item_type === "QUIZ" ? (
                    <p className="item-meta">
                      {item.question_count} questions · {item.time_limit_min} min · pass {item.pass_mark}%
                    </p>
                  ) : (
                    <>
                      <p className="item-meta">~{item.est_hours} hours</p>
                      <div className="tag-row">
                        {item.tech.map((tech) => <span className="tag" key={tech}>{tech}</span>)}
                      </div>
                    </>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>

        <form className="panel glass-panel form-panel" onSubmit={handleSubmit}>
          <h2 className="panel-title">Add a learning item</h2>
          <label>
            Type
            <select value={form.item_type} onChange={set("item_type")}>
              <option value="QUIZ">Quiz</option>
              <option value="PROJECT">Project</option>
            </select>
          </label>
          <label>
            Title
            <input required maxLength={150} value={form.title} onChange={set("title")} />
          </label>
          <label>
            Topic
            <select required value={form.topic_id} onChange={set("topic_id")}>
              <option value="">Select a topic</option>
              {topics.map((topic) => (
                <option key={topic.topic_id} value={topic.topic_id}>{topic.name}</option>
              ))}
            </select>
          </label>
          <label>
            Difficulty (1-5)
            <input type="number" min={1} max={5} value={form.difficulty} onChange={set("difficulty")} />
          </label>

          {form.item_type === "QUIZ" ? (
            <>
              <label>
                Time limit (minutes)
                <input type="number" min={1} value={form.time_limit_min} onChange={set("time_limit_min")} />
              </label>
              <label>
                Pass mark (%)
                <input type="number" min={0} max={100} value={form.pass_mark} onChange={set("pass_mark")} />
              </label>
            </>
          ) : (
            <>
              <label>
                Estimated hours
                <input type="number" min={0.5} step={0.5} value={form.est_hours} onChange={set("est_hours")} />
              </label>
              <label>
                Repository URL
                <input type="url" value={form.repo_url} onChange={set("repo_url")} />
              </label>
              <label>
                Technologies (comma separated)
                <input value={form.tech} placeholder="Python, Git" onChange={set("tech")} />
              </label>
            </>
          )}

          <button type="submit" className="primary-button">
            <Plus size={16} /> Add item
          </button>
        </form>
      </section>
    </>
  );
}
