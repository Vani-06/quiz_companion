import { useEffect, useState } from "react";
import { CheckCircle2, RotateCcw, Send, XCircle } from "lucide-react";
import { api } from "../services/api";
import { EmptyState, ErrorBanner } from "../components/common";

// Student view of a quiz: answers are graded by grade_quiz() and stored by record_attempt().
export default function TakeQuiz({ quizId, userId }) {
  const [paper, setPaper] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getQuizPaper(quizId)
      .then(setPaper)
      .catch((err) => setError(err.message));
  }, [quizId]);

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setError("");
      setSubmitting(true);
      setResult(await api.submitQuiz(quizId, userId, answers));
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function retake() {
    setAnswers({});
    setResult(null);
  }

  if (!paper) return <ErrorBanner message={error} />;

  return (
    <section className="two-column">
      <form className="panel glass-panel form-panel" onSubmit={handleSubmit}>
        <h2 className="panel-title">{paper.title}</h2>
        <p className="item-meta">
          {paper.questions.length} questions · {paper.time_limit_min} min · pass mark{" "}
          {paper.pass_mark}%
        </p>
        <ErrorBanner message={error} onClose={() => setError("")} />

        {paper.questions.length === 0 ? (
          <EmptyState title="No questions yet" text="Add questions in the question bank." />
        ) : (
          paper.questions.map((q) => (
            <label key={q.question_no}>
              Q{q.question_no}. {q.question_text} ({q.marks} marks)
              <input
                required
                disabled={Boolean(result)}
                value={answers[q.question_no] ?? ""}
                onChange={(e) =>
                  setAnswers({ ...answers, [q.question_no]: e.target.value })
                }
              />
            </label>
          ))
        )}

        {result ? (
          <button type="button" className="primary-button" onClick={retake}>
            <RotateCcw size={16} /> Try again
          </button>
        ) : (
          <button
            type="submit"
            className="primary-button"
            disabled={submitting || paper.questions.length === 0}
          >
            <Send size={16} /> {submitting ? "Submitting..." : "Submit answers"}
          </button>
        )}
      </form>

      <div className="panel glass-panel">
        <h2 className="panel-title">Result</h2>
        {result ? (
          <div className={`quiz-result ${result.passed ? "passed" : "failed"}`}>
            {result.passed ? <CheckCircle2 size={34} /> : <XCircle size={34} />}
            <div className="quiz-score">{result.score}%</div>
            <strong>{result.passed ? "Passed" : "Not passed yet"}</strong>
            <p className="item-meta">
              Attempt {result.attempt_no} · pass mark {result.pass_mark}%. Your topic
              proficiency has been updated.
            </p>
          </div>
        ) : (
          <EmptyState
            title="Not submitted"
            text="Answer every question, then submit to see your score."
          />
        )}
      </div>
    </section>
  );
}
