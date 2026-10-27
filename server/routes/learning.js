// Learning flow: taking quizzes, submitting projects, strengths,
// recommendations and the leaderboard. Rules live in db/business_logic.sql.
import { Router } from "express";
import { pool, query } from "../db.js";
import { vectorsAvailable } from "../embeddings.js";
import { badRequest, route, toId } from "../http.js";

export const learningRouter = Router();

// Questions without answers, for a student taking the quiz.
learningRouter.get(
  "/quizzes/:id/paper",
  route(async (req, res) => {
    const id = toId(req.params.id);
    if (!id) return badRequest(res, "Invalid quiz id");

    const quiz = await query(
      `SELECT li.item_id, li.title, q.time_limit_min, q.pass_mark
       FROM quiz q JOIN learning_item li ON li.item_id = q.item_id
       WHERE q.item_id = $1`,
      [id]
    );
    if (quiz.rowCount === 0) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    const questions = await query(
      `SELECT question_no, question_text, marks
       FROM question WHERE quiz_id = $1 ORDER BY question_no`,
      [id]
    );
    res.json({ ...quiz.rows[0], questions: questions.rows });
  })
);

// Grades the answers, records the attempt, and lets the trigger update proficiency.
learningRouter.post(
  "/quizzes/:id/attempts",
  route(async (req, res) => {
    const quizId = toId(req.params.id);
    const userId = toId(req.body.userId);
    const answers = req.body.answers;

    if (!quizId || !userId) return badRequest(res, "Invalid quiz or user id");
    if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
      return badRequest(res, "answers must map question numbers to answers");
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const graded = await client.query(
        `SELECT grade_quiz($1, $2::jsonb)::float AS score, q.pass_mark
         FROM quiz q WHERE q.item_id = $1`,
        [quizId, JSON.stringify(answers)]
      );
      if (graded.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Quiz not found" });
      }
      const { score, pass_mark } = graded.rows[0];
      if (score === null) {
        await client.query("ROLLBACK");
        return badRequest(res, "This quiz has no questions yet");
      }

      const attempt = await client.query(
        "SELECT record_attempt($1, $2, 'completed', $3) AS attempt_no",
        [userId, quizId, score]
      );
      await client.query("COMMIT");

      res.status(201).json({
        score,
        pass_mark,
        passed: score >= pass_mark,
        attempt_no: attempt.rows[0].attempt_no,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  })
);

learningRouter.post(
  "/projects/:id/submissions",
  route(async (req, res) => {
    const projectId = toId(req.params.id);
    const userId = toId(req.body.userId);
    const score =
      req.body.score === undefined || req.body.score === ""
        ? null
        : Number(req.body.score);

    if (!projectId || !userId) return badRequest(res, "Invalid project or user id");
    if (score !== null && Number.isNaN(score)) {
      return badRequest(res, "score must be a number");
    }

    const project = await query("SELECT 1 FROM project WHERE item_id = $1", [projectId]);
    if (project.rowCount === 0) {
      return res.status(404).json({ error: "Project not found" });
    }

    const { rows } = await query(
      "SELECT record_attempt($1, $2, 'submitted', $3) AS attempt_no",
      [userId, projectId, score]
    );
    res.status(201).json({ attempt_no: rows[0].attempt_no, score });
  })
);

learningRouter.get(
  "/users/:id/strengths",
  route(async (req, res) => {
    const userId = toId(req.params.id);
    if (!userId) return badRequest(res, "Invalid user id");

    const { rows } = await query(
      `SELECT topic_id, topic, proficiency_score::float AS proficiency_score, strength
       FROM v_topic_strength WHERE user_id = $1
       ORDER BY proficiency_score`,
      [userId]
    );
    res.json(rows);
  })
);

learningRouter.post(
  "/users/:id/recommendations/generate",
  route(async (req, res) => {
    const userId = toId(req.params.id);
    if (!userId) return badRequest(res, "Invalid user id");

    // Rule-based: items from weak topics.
    const weak = await query("SELECT generate_recommendations($1) AS added", [userId]);

    // Vector-based: unseen items similar to what the student found hard (pgvector).
    let similar = 0;
    if (await vectorsAvailable()) {
      const { rows } = await query(
        "SELECT generate_similar_recommendations($1) AS added",
        [userId]
      );
      similar = rows[0].added;
    }

    const weakTopic = weak.rows[0].added;
    res.json({ added: weakTopic + similar, weakTopic, similar });
  })
);

learningRouter.get(
  "/leaderboard",
  route(async (_req, res) => {
    const { rows } = await query(
      `SELECT user_id, full_name, total_score::float AS total_score, rank::int AS rank
       FROM v_leaderboard ORDER BY rank, full_name`
    );
    res.json(rows);
  })
);
