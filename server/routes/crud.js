// Update and delete operations that complete CRUD for every entity.
import { Router } from "express";
import { pool, query } from "../db.js";
import { refreshInBackground } from "../embeddings.js";
import { route } from "../http.js";
import {
  parseItem,
  parseProjectDetails,
  parseQuestion,
  parseQuizDetails,
  parseTopic,
  parseUserUpdate,
} from "../inputs.js";
import { ValidationError, id, integer } from "../validation.js";

export const crudRouter = Router();

const notFound = (res, what) => res.status(404).json({ error: `${what} not found` });

// Runs work inside one transaction on a dedicated client.
async function inTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------- topics ----

crudRouter.put(
  "/topics/:id",
  route(async (req, res) => {
    const topicId = id(req.params.id, "Topic id");
    const topic = parseTopic(req.body);
    if (topic.parent_topic_id === topicId) {
      throw new ValidationError("A topic cannot be its own parent");
    }

    const { rows } = await query(
      `UPDATE topic SET name = $2, description = $3, parent_topic_id = $4
       WHERE topic_id = $1 RETURNING *`,
      [topicId, topic.name, topic.description, topic.parent_topic_id]
    );
    if (rows.length === 0) return notFound(res, "Topic");
    res.json(rows[0]);
  })
);

// -------------------------------------------------------- learning items ----
// The item type cannot change; the matching subclass row is updated with it.

crudRouter.put(
  "/items/:id",
  route(async (req, res) => {
    const itemId = id(req.params.id, "Item id");
    const item = parseItem(req.body, { creating: false });

    const updated = await inTransaction(async (client) => {
      const { rows } = await client.query(
        `UPDATE learning_item SET title = $2, topic_id = $3, difficulty = $4
         WHERE item_id = $1 RETURNING *`,
        [itemId, item.title, item.topic_id, item.difficulty]
      );
      if (rows.length === 0) return null;

      if (rows[0].item_type === "QUIZ") {
        const quiz = parseQuizDetails(req.body);
        await client.query(
          "UPDATE quiz SET time_limit_min = $2, pass_mark = $3 WHERE item_id = $1",
          [itemId, quiz.time_limit_min, quiz.pass_mark]
        );
      } else {
        const project = parseProjectDetails(req.body);
        await client.query(
          "UPDATE project SET est_hours = $2, repo_url = $3 WHERE item_id = $1",
          [itemId, project.est_hours, project.repo_url]
        );
        await client.query("DELETE FROM project_tech WHERE item_id = $1", [itemId]);
        for (const tech of project.tech) {
          await client.query(
            "INSERT INTO project_tech (item_id, tech) VALUES ($1, $2)",
            [itemId, tech]
          );
        }
      }
      return rows[0];
    });

    if (!updated) return notFound(res, "Learning item");
    res.json(updated);
    refreshInBackground(itemId);
  })
);

// ------------------------------------------------------------- questions ----

crudRouter.put(
  "/quizzes/:id/questions/:no",
  route(async (req, res) => {
    const quizId = id(req.params.id, "Quiz id");
    const questionNo = integer(req.params.no, "Question number", {
      required: true, min: 1, max: 32767,
    });
    const question = parseQuestion(req.body);

    const { rows } = await query(
      `UPDATE question SET question_text = $3, correct_answer = $4, marks = $5
       WHERE quiz_id = $1 AND question_no = $2 RETURNING *`,
      [quizId, questionNo, question.question_text, question.correct_answer, question.marks]
    );
    if (rows.length === 0) return notFound(res, "Question");
    res.json(rows[0]);
    refreshInBackground(quizId);
  })
);

crudRouter.delete(
  "/quizzes/:id/questions/:no",
  route(async (req, res) => {
    const quizId = id(req.params.id, "Quiz id");
    const questionNo = integer(req.params.no, "Question number", {
      required: true, min: 1, max: 32767,
    });

    const result = await query(
      "DELETE FROM question WHERE quiz_id = $1 AND question_no = $2",
      [quizId, questionNo]
    );
    if (result.rowCount === 0) return notFound(res, "Question");
    res.status(204).end();
    refreshInBackground(quizId);
  })
);

// ----------------------------------------------------------------- users ----

crudRouter.get(
  "/users/:id",
  route(async (req, res) => {
    const userId = id(req.params.id, "User id");
    const { rows } = await query(
      `SELECT user_id, full_name, email, skill_level, created_at
       FROM users WHERE user_id = $1`,
      [userId]
    );
    if (rows.length === 0) return notFound(res, "User");
    res.json(rows[0]);
  })
);

crudRouter.put(
  "/users/:id",
  route(async (req, res) => {
    const userId = id(req.params.id, "User id");
    const user = parseUserUpdate(req.body);

    const { rows } = await query(
      `UPDATE users SET full_name = $2, skill_level = $3
       WHERE user_id = $1
       RETURNING user_id, full_name, email, skill_level`,
      [userId, user.full_name, user.skill_level]
    );
    if (rows.length === 0) return notFound(res, "User");
    res.json(rows[0]);
  })
);

// Removes the student and everything recorded for them, children first.
crudRouter.delete(
  "/users/:id",
  route(async (req, res) => {
    const userId = id(req.params.id, "User id");

    const deleted = await inTransaction(async (client) => {
      await client.query("DELETE FROM recommendation WHERE user_id = $1", [userId]);
      await client.query("DELETE FROM topic_proficiency WHERE user_id = $1", [userId]);
      await client.query("DELETE FROM learning_record WHERE user_id = $1", [userId]);
      const result = await client.query("DELETE FROM users WHERE user_id = $1", [userId]);
      return result.rowCount;
    });

    if (deleted === 0) return notFound(res, "User");
    res.status(204).end();
  })
);
