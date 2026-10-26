import express from "express";
import cors from "cors";
import { pool, query } from "./db.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

// Wraps async handlers so rejected promises reach the error middleware.
const route = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const toId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const badRequest = (res, message) => res.status(400).json({ error: message });

// ---------------------------------------------------------------- health ----

app.get(
  "/api/health",
  route(async (_req, res) => {
    const { rows } = await query("SELECT NOW() AS server_time");
    res.json({ status: "ok", database: "connected", time: rows[0].server_time });
  })
);

// ----------------------------------------------------------------- users ----

app.get(
  "/api/users",
  route(async (_req, res) => {
    const { rows } = await query(
      `SELECT user_id, full_name, email, skill_level
       FROM users ORDER BY user_id`
    );
    res.json(rows);
  })
);

// ------------------------------------------------------------- dashboard ----

app.get(
  "/api/dashboard",
  route(async (req, res) => {
    const userId = toId(req.query.userId);
    if (!userId) return badRequest(res, "userId is required");

    const user = await query(
      `SELECT user_id, full_name, email, skill_level
       FROM users WHERE user_id = $1`,
      [userId]
    );
    if (user.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const [summary, proficiency, recommendations, recent] = await Promise.all([
      query(
        `SELECT COUNT(*)::int AS attempts,
                COUNT(DISTINCT item_id)::int AS items_tried,
                COALESCE(ROUND(AVG(score), 1), 0)::float AS average_score,
                COALESCE(MAX(score), 0)::float AS best_score
         FROM learning_record WHERE user_id = $1`,
        [userId]
      ),
      query(
        `SELECT t.topic_id, t.name AS topic,
                tp.proficiency_score::float AS proficiency_score,
                tp.attempts_count, tp.last_updated
         FROM topic_proficiency tp
         JOIN topic t ON t.topic_id = tp.topic_id
         WHERE tp.user_id = $1
         ORDER BY tp.proficiency_score DESC`,
        [userId]
      ),
      query(
        `SELECT r.item_id, li.title, li.item_type, li.difficulty,
                t.name AS topic, r.rank_score::float AS rank_score,
                r.reason, r.status, r.created_at
         FROM recommendation r
         JOIN learning_item li ON li.item_id = r.item_id
         LEFT JOIN topic t ON t.topic_id = li.topic_id
         WHERE r.user_id = $1
         ORDER BY r.rank_score DESC`,
        [userId]
      ),
      query(
        `SELECT lr.item_id, li.title, li.item_type, lr.attempt_no,
                lr.status, lr.score::float AS score,
                lr.started_at, lr.completed_at
         FROM learning_record lr
         JOIN learning_item li ON li.item_id = lr.item_id
         WHERE lr.user_id = $1
         ORDER BY lr.started_at DESC
         LIMIT 8`,
        [userId]
      ),
    ]);

    res.json({
      user: user.rows[0],
      summary: {
        ...summary.rows[0],
        topics_tracked: proficiency.rowCount,
        active_recommendations: recommendations.rows.filter(
          (row) => row.status === "active"
        ).length,
      },
      proficiency: proficiency.rows,
      recommendations: recommendations.rows,
      recent: recent.rows,
    });
  })
);

// ---------------------------------------------------------------- topics ----

app.get(
  "/api/topics",
  route(async (_req, res) => {
    const { rows } = await query(
      `SELECT t.topic_id, t.name, t.description, t.parent_topic_id,
              p.name AS parent_name,
              (SELECT COUNT(*)::int FROM learning_item li
               WHERE li.topic_id = t.topic_id) AS item_count
       FROM topic t
       LEFT JOIN topic p ON p.topic_id = t.parent_topic_id
       ORDER BY t.topic_id`
    );
    res.json(rows);
  })
);

app.post(
  "/api/topics",
  route(async (req, res) => {
    const name = String(req.body.name ?? "").trim();
    const description = String(req.body.description ?? "").trim() || null;
    const parentId = req.body.parent_topic_id
      ? toId(req.body.parent_topic_id)
      : null;

    if (!name) return badRequest(res, "Topic name is required");

    const { rows } = await query(
      `INSERT INTO topic (name, description, parent_topic_id)
       VALUES ($1, $2, $3) RETURNING *`,
      [name, description, parentId]
    );
    res.status(201).json(rows[0]);
  })
);

app.delete(
  "/api/topics/:id",
  route(async (req, res) => {
    const id = toId(req.params.id);
    if (!id) return badRequest(res, "Invalid topic id");

    const result = await query("DELETE FROM topic WHERE topic_id = $1", [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Topic not found" });
    }
    res.status(204).end();
  })
);

// -------------------------------------------------------- learning items ----

app.get(
  "/api/items",
  route(async (req, res) => {
    const type = req.query.type ? String(req.query.type).toUpperCase() : null;
    const { rows } = await query(
      `SELECT li.item_id, li.title, li.difficulty, li.item_type, li.created_at,
              t.topic_id, t.name AS topic,
              q.time_limit_min, q.pass_mark,
              p.est_hours::float AS est_hours, p.repo_url,
              COALESCE(
                (SELECT ARRAY_AGG(pt.tech ORDER BY pt.tech)
                 FROM project_tech pt WHERE pt.item_id = li.item_id),
                '{}') AS tech,
              (SELECT COUNT(*)::int FROM question qu
               WHERE qu.quiz_id = li.item_id) AS question_count
       FROM learning_item li
       LEFT JOIN topic t ON t.topic_id = li.topic_id
       LEFT JOIN quiz q ON q.item_id = li.item_id
       LEFT JOIN project p ON p.item_id = li.item_id
       WHERE ($1::text IS NULL OR li.item_type = $1)
       ORDER BY li.item_id`,
      [type]
    );
    res.json(rows);
  })
);

app.post(
  "/api/items",
  route(async (req, res) => {
    const { title, topic_id, difficulty, item_type } = req.body;
    const type = String(item_type ?? "").toUpperCase();
    const cleanTitle = String(title ?? "").trim();

    if (!cleanTitle) return badRequest(res, "Title is required");
    if (!["QUIZ", "PROJECT"].includes(type)) {
      return badRequest(res, "item_type must be QUIZ or PROJECT");
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const item = await client.query(
        `INSERT INTO learning_item
           (topic_id, title, difficulty, item_type, created_at)
         VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
        [toId(topic_id), cleanTitle, Number(difficulty) || null, type]
      );
      const itemId = item.rows[0].item_id;

      if (type === "QUIZ") {
        await client.query(
          `INSERT INTO quiz (item_id, time_limit_min, pass_mark)
           VALUES ($1, $2, $3)`,
          [itemId, Number(req.body.time_limit_min) || null,
           Number(req.body.pass_mark) || null]
        );
      } else {
        await client.query(
          `INSERT INTO project (item_id, est_hours, repo_url)
           VALUES ($1, $2, $3)`,
          [itemId, Number(req.body.est_hours) || null,
           String(req.body.repo_url ?? "").trim() || null]
        );
        const tech = String(req.body.tech ?? "")
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean);
        for (const entry of new Set(tech)) {
          await client.query(
            "INSERT INTO project_tech (item_id, tech) VALUES ($1, $2)",
            [itemId, entry]
          );
        }
      }

      await client.query("COMMIT");
      res.status(201).json(item.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  })
);

app.delete(
  "/api/items/:id",
  route(async (req, res) => {
    const id = toId(req.params.id);
    if (!id) return badRequest(res, "Invalid item id");

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // Child rows first, then the subclass row, then the supertype row.
      await client.query("DELETE FROM project_tech WHERE item_id = $1", [id]);
      await client.query("DELETE FROM question WHERE quiz_id = $1", [id]);
      await client.query("DELETE FROM quiz WHERE item_id = $1", [id]);
      await client.query("DELETE FROM project WHERE item_id = $1", [id]);
      const result = await client.query(
        "DELETE FROM learning_item WHERE item_id = $1",
        [id]
      );
      await client.query("COMMIT");

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Learning item not found" });
      }
      res.status(204).end();
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  })
);

// ------------------------------------------------------------- questions ----

app.get(
  "/api/quizzes/:id/questions",
  route(async (req, res) => {
    const id = toId(req.params.id);
    if (!id) return badRequest(res, "Invalid quiz id");

    const { rows } = await query(
      `SELECT question_no, question_text, correct_answer, marks
       FROM question WHERE quiz_id = $1 ORDER BY question_no`,
      [id]
    );
    res.json(rows);
  })
);

app.post(
  "/api/quizzes/:id/questions",
  route(async (req, res) => {
    const id = toId(req.params.id);
    if (!id) return badRequest(res, "Invalid quiz id");

    const text = String(req.body.question_text ?? "").trim();
    const answer = String(req.body.correct_answer ?? "").trim();
    if (!text || !answer) {
      return badRequest(res, "Question text and correct answer are required");
    }

    const { rows } = await query(
      `INSERT INTO question
         (quiz_id, question_no, question_text, correct_answer, marks)
       VALUES ($1,
               (SELECT COALESCE(MAX(question_no), 0) + 1
                FROM question WHERE quiz_id = $1),
               $2, $3, $4)
       RETURNING *`,
      [id, text, answer, Number(req.body.marks) || 1]
    );
    res.status(201).json(rows[0]);
  })
);

// ------------------------------------------------------------ attempts ------

app.get(
  "/api/records",
  route(async (req, res) => {
    const userId = toId(req.query.userId);
    if (!userId) return badRequest(res, "userId is required");

    const { rows } = await query(
      `SELECT lr.item_id, li.title, li.item_type, t.name AS topic,
              lr.attempt_no, lr.status, lr.score::float AS score,
              lr.started_at, lr.completed_at
       FROM learning_record lr
       JOIN learning_item li ON li.item_id = lr.item_id
       LEFT JOIN topic t ON t.topic_id = li.topic_id
       WHERE lr.user_id = $1
       ORDER BY lr.started_at DESC`,
      [userId]
    );
    res.json(rows);
  })
);

// ------------------------------------------------------ recommendations -----

app.patch(
  "/api/recommendations/:userId/:itemId",
  route(async (req, res) => {
    const userId = toId(req.params.userId);
    const itemId = toId(req.params.itemId);
    const status = String(req.body.status ?? "");

    if (!userId || !itemId) return badRequest(res, "Invalid identifiers");
    if (!["active", "completed", "dismissed"].includes(status)) {
      return badRequest(res, "status must be active, completed or dismissed");
    }

    const { rows } = await query(
      `UPDATE recommendation SET status = $3
       WHERE user_id = $1 AND item_id = $2 RETURNING *`,
      [userId, itemId, status]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Recommendation not found" });
    }
    res.json(rows[0]);
  })
);

// --------------------------------------------------------------- errors -----

// Maps PostgreSQL error codes to readable API errors.
app.use((error, _req, res, _next) => {
  const messages = {
    "23505": [409, "That value already exists (unique constraint)."],
    "23503": [409, "Blocked by a related record (foreign key constraint)."],
    "23502": [400, "A required field is missing (not-null constraint)."],
    "23514": [400, "A value is outside the allowed range (check constraint)."],
    // Raised by business-logic triggers; their message is meant for the user.
    "23001": [409, error.message],
  };
  const mapped = messages[error.code];
  if (mapped) {
    return res.status(mapped[0]).json({ error: mapped[1], detail: error.detail });
  }
  console.error(error);
  res.status(500).json({ error: "Database request failed." });
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}/api`);
});
