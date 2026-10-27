// Vector recommendation tests. They use hand-made embeddings (no model download),
// so they check the SQL in db/vectors.sql: profile weighting, similarity ranking,
// exclusions and cascades. Skipped when the test database has no pgvector.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { after, before, describe, test } from "node:test";
import { resetDatabase } from "./helpers.js";

const { pool } = await import("../server/db.js");
const readSql = (name) =>
  readFile(fileURLToPath(new URL(`../db/${name}`, import.meta.url)), "utf8");

// Items in the same topic share a direction; Linked Lists sits close to Arrays.
const DIRECTIONS = {
  Arrays: { 0: 1 },
  "Linked Lists": { 0: 0.8, 1: 0.6 },
  "Stacks and Queues": { 1: 0.6, 2: 0.8 },
  "SQL Queries": { 5: 1 },
  Normalization: { 6: 1 },
};

function vectorFor(topic, itemId) {
  const values = new Array(384).fill(0);
  const direction = DIRECTIONS[topic] ?? { [20 + (itemId % 300)]: 1 };
  for (const [index, value] of Object.entries(direction)) values[index] = value;
  return `[${values.join(",")}]`;
}

let vectorsReady = false;

before(async () => {
  await resetDatabase();
  await pool.query(await readSql("seed_more.sql"));
  try {
    await pool.query(await readSql("vectors.sql"));
    vectorsReady = true;
  } catch {
    return;
  }
  const { rows } = await pool.query(
    `SELECT li.item_id, t.name AS topic FROM learning_item li
     JOIN topic t ON t.topic_id = li.topic_id`
  );
  for (const row of rows) {
    await pool.query(
      `INSERT INTO item_embedding (item_id, embedding, model, source_text)
       VALUES ($1, $2::vector, 'test', 'test')`,
      [row.item_id, vectorFor(row.topic, row.item_id)]
    );
  }
});

after(async () => {
  await pool.end();
});

const userId = async (email) =>
  (await pool.query("SELECT user_id FROM users WHERE email = $1", [email])).rows[0].user_id;

describe("vector recommendations", () => {
  test("profile leans towards the items a student found hard", async (t) => {
    if (!vectorsReady) return t.skip("pgvector is not installed");
    const kabir = await userId("kabir@example.edu");
    const { rows } = await pool.query(
      `SELECT 1 - (student_profile($1) <=> $2::vector) AS arrays,
              1 - (student_profile($1) <=> $3::vector) AS stacks`,
      [kabir, vectorFor("Arrays", 0), vectorFor("Stacks and Queues", 0)]
    );
    assert.ok(rows[0].arrays > rows[0].stacks, "struggled arrays outweigh the passed stacks quiz");
  });

  test("recommends unseen items closest to the profile, with a reason", async (t) => {
    if (!vectorsReady) return t.skip("pgvector is not installed");
    const kabir = await userId("kabir@example.edu");
    const added = await pool.query("SELECT generate_similar_recommendations($1, 2) AS n", [kabir]);
    assert.equal(added.rows[0].n, 2);

    const { rows } = await pool.query(
      `SELECT li.title, r.reason, r.rank_score::float AS rank
       FROM recommendation r JOIN learning_item li ON li.item_id = r.item_id
       WHERE r.user_id = $1 AND r.reason ~ '^(Similar to|Builds on) '
       ORDER BY r.rank_score DESC`,
      [kabir]
    );
    // Kabir struggled with Array Basics (45) and Linked List Basics (50).
    assert.equal(rows[0].title, "Linked List Visualiser");
    assert.match(rows[0].reason, /^Similar to Linked List Basics/);
    assert.ok(rows[0].rank > 0.9);
    assert.ok(["Array Practice Lab", "Array Searching"].includes(rows[1].title));
    assert.match(rows[1].reason, /^Similar to Array Basics/);
  });

  test("never recommends attempted or already-recommended items", async (t) => {
    if (!vectorsReady) return t.skip("pgvector is not installed");
    const kabir = await userId("kabir@example.edu");
    await pool.query("SELECT generate_similar_recommendations($1, 100)", [kabir]);
    const again = await pool.query("SELECT generate_similar_recommendations($1, 100) AS n", [kabir]);
    assert.equal(again.rows[0].n, 0);

    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS n FROM recommendation r
       JOIN learning_record lr ON lr.user_id = r.user_id AND lr.item_id = r.item_id
       WHERE r.user_id = $1 AND r.reason ~ '^(Similar to|Builds on) '`,
      [kabir]
    );
    assert.equal(rows[0].n, 0);
  });

  test("a student with no attempts gets no similar items", async (t) => {
    if (!vectorsReady) return t.skip("pgvector is not installed");
    const { rows } = await pool.query("SELECT register_user('New', 'new@example.edu', 'x') AS id");
    const added = await pool.query("SELECT generate_similar_recommendations($1) AS n", [rows[0].id]);
    assert.equal(added.rows[0].n, 0);
  });

  test("deleting an item removes its embedding", async (t) => {
    if (!vectorsReady) return t.skip("pgvector is not installed");
    const { rows } = await pool.query(
      `INSERT INTO learning_item (topic_id, title, item_type) VALUES (1, 'Temp item', 'QUIZ')
       RETURNING item_id`
    );
    const id = rows[0].item_id;
    await pool.query(
      "INSERT INTO item_embedding (item_id, embedding, model, source_text) VALUES ($1, $2::vector, 't', 't')",
      [id, vectorFor("Arrays", id)]
    );
    await pool.query("DELETE FROM learning_item WHERE item_id = $1", [id]);
    const left = await pool.query("SELECT COUNT(*)::int AS n FROM item_embedding WHERE item_id = $1", [id]);
    assert.equal(left.rows[0].n, 0);
  });
});
