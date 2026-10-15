import { useCallback, useEffect, useState } from "react";
import { Brain, Plus } from "lucide-react";
import { api } from "../services/api";
import { EmptyState, ErrorBanner, PageHeader } from "../components/common";

const EMPTY_QUESTION = { question_text: "", correct_answer: "", marks: 2 };

export default function Quizzes() {
  const [quizzes, setQuizzes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [form, setForm] = useState(EMPTY_QUESTION);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getItems("QUIZ")
      .then((rows) => {
        setQuizzes(rows);
        setSelectedId((current) => current ?? rows[0]?.item_id ?? null);
      })
      .catch((err) => setError(err.message));
  }, []);

  const loadQuestions = useCallback(async (quizId) => {
    try {
      setQuestions(await api.getQuestions(quizId));
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    if (selectedId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadQuestions(selectedId);
    }
  }, [selectedId, loadQuestions]);

  const quiz = quizzes.find((row) => row.item_id === selectedId);
  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setError("");
      await api.addQuestion(selectedId, form);
      setForm(EMPTY_QUESTION);
      await loadQuestions(selectedId);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={<><Brain size={14} /> QUIZZES</>}
        title="Quiz question bank"
        subtitle="Questions are a weak entity: each is identified by quiz and question number."
      />
      <ErrorBanner message={error} onClose={() => setError("")} />

      {quizzes.length === 0 ? (
        <EmptyState title="No quizzes yet" text="Add a quiz under Learning Items." />
      ) : (
        <>
          <div className="category-filters">
            {quizzes.map((row) => (
              <button key={row.item_id} type="button"
                className={`category-filter ${row.item_id === selectedId ? "active" : ""}`}
                aria-pressed={row.item_id === selectedId}
                onClick={() => setSelectedId(row.item_id)}>
                {row.title}
              </button>
            ))}
          </div>

          <section className="two-column">
            <div className="panel glass-panel">
              <h2 className="panel-title">{quiz?.title}</h2>
              <p className="item-meta">
                {quiz?.topic} · {quiz?.time_limit_min} min · pass mark {quiz?.pass_mark}% ·{" "}
                {totalMarks} total marks
              </p>
              {questions.length === 0 ? (
                <EmptyState title="No questions yet" />
              ) : (
                <ol className="question-list">
                  {questions.map((q) => (
                    <li key={q.question_no}>
                      <div className="question-head">
                        <strong>Q{q.question_no}. {q.question_text}</strong>
                        <span className="tag">{q.marks} marks</span>
                      </div>
                      <div className="cell-note">Answer: {q.correct_answer}</div>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <form className="panel glass-panel form-panel" onSubmit={handleSubmit}>
              <h2 className="panel-title">Add a question</h2>
              <label>
                Question
                <textarea required rows={3} value={form.question_text}
                  onChange={(e) => setForm({ ...form, question_text: e.target.value })} />
              </label>
              <label>
                Correct answer
                <input required value={form.correct_answer}
                  onChange={(e) => setForm({ ...form, correct_answer: e.target.value })} />
              </label>
              <label>
                Marks
                <input type="number" min={1} value={form.marks}
                  onChange={(e) => setForm({ ...form, marks: e.target.value })} />
              </label>
              <button type="submit" className="primary-button">
                <Plus size={16} /> Add question
              </button>
            </form>
          </section>
        </>
      )}
    </>
  );
}
