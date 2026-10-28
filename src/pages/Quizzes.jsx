import { useCallback, useEffect, useState } from "react";
import { Brain, ListChecks, PenLine, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { api } from "../services/api";
import { EmptyState, ErrorBanner, PageHeader } from "../components/common";
import TakeQuiz from "./TakeQuiz";

const EMPTY_QUESTION = { question_text: "", correct_answer: "", marks: 2 };

export default function Quizzes({ userId }) {
  const [mode, setMode] = useState("take");
  const [quizzes, setQuizzes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [form, setForm] = useState(EMPTY_QUESTION);
  const [editingNo, setEditingNo] = useState(null);
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
      if (editingNo) {
        await api.updateQuestion(selectedId, editingNo, form);
      } else {
        await api.addQuestion(selectedId, form);
      }
      cancelEdit();
      await loadQuestions(selectedId);
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(question) {
    setEditingNo(question.question_no);
    setForm({
      question_text: question.question_text,
      correct_answer: question.correct_answer,
      marks: question.marks,
    });
  }

  function cancelEdit() {
    setEditingNo(null);
    setForm(EMPTY_QUESTION);
  }

  function selectQuiz(quizId) {
    cancelEdit();
    setSelectedId(quizId);
  }

  async function handleDelete(question) {
    if (!window.confirm(`Delete question ${question.question_no}?`)) return;
    try {
      setError("");
      await api.deleteQuestion(selectedId, question.question_no);
      if (editingNo === question.question_no) cancelEdit();
      await loadQuestions(selectedId);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={<><Brain size={14} /> QUIZZES</>}
        title={mode === "take" ? "Take a quiz" : "Quiz question bank"}
        subtitle={
          mode === "take"
            ? "Answers are graded in the database and saved as a new attempt."
            : "Questions are a weak entity: each is identified by quiz and question number."
        }
      >
        <div className="category-filters">
          <button type="button"
            className={`category-filter ${mode === "take" ? "active" : ""}`}
            aria-pressed={mode === "take"} onClick={() => setMode("take")}>
            <PenLine size={14} /> Take quiz
          </button>
          <button type="button"
            className={`category-filter ${mode === "bank" ? "active" : ""}`}
            aria-pressed={mode === "bank"} onClick={() => setMode("bank")}>
            <ListChecks size={14} /> Question bank
          </button>
        </div>
      </PageHeader>
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
                onClick={() => selectQuiz(row.item_id)}>
                {row.title}
              </button>
            ))}
          </div>

          {mode === "take" ? (
            <TakeQuiz key={`${selectedId}-${userId}`} quizId={selectedId} userId={userId} />
          ) : (
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
                          <div className="row-actions">
                            <span className="tag">{q.marks} marks</span>
                            <button type="button" className="icon-button"
                              aria-label={`Edit question ${q.question_no}`}
                              onClick={() => startEdit(q)}>
                              <Pencil size={14} />
                            </button>
                            <button type="button" className="icon-button"
                              aria-label={`Delete question ${q.question_no}`}
                              onClick={() => handleDelete(q)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="cell-note">Answer: {q.correct_answer}</div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              <form className="panel glass-panel form-panel" onSubmit={handleSubmit}>
                <h2 className="panel-title">
                  {editingNo ? `Edit question ${editingNo}` : "Add a question"}
                </h2>
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
                <div className="form-actions">
                  <button type="submit" className="primary-button">
                    {editingNo
                      ? <><Save size={16} /> Save changes</>
                      : <><Plus size={16} /> Add question</>}
                  </button>
                  {editingNo && (
                    <button type="button" className="mini-button" onClick={cancelEdit}>
                      <X size={13} /> Cancel
                    </button>
                  )}
                </div>
              </form>
            </section>
          )}
        </>
      )}
    </>
  );
}
