// Text embeddings for learning items, stored in item_embedding (db/vectors.sql).
// Uses the all-MiniLM-L6-v2 sentence model locally through transformers.js:
// no API key, 384-dimension normalised vectors. The model (about 23 MB) is
// downloaded from Hugging Face on first use and cached.
import { query } from "./db.js";

export const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";
export const EMBEDDING_DIMENSIONS = 384;

let extractorPromise;

async function extractor() {
  extractorPromise ??= import("@huggingface/transformers").then(({ pipeline }) =>
    pipeline("feature-extraction", EMBEDDING_MODEL)
  );
  return extractorPromise;
}

export async function embedText(text) {
  const extract = await extractor();
  const output = await extract(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

// pgvector accepts vectors written as '[0.1,0.2,...]'.
export const toVectorLiteral = (values) => `[${values.join(",")}]`;

// True when db/vectors.sql has been applied (pgvector installed).
let available;
export async function vectorsAvailable() {
  if (process.env.EMBEDDINGS_DISABLED === "1") return false;
  if (available === undefined) {
    const { rows } = await query("SELECT to_regclass('item_embedding') IS NOT NULL AS ready");
    available = rows[0].ready;
  }
  return available;
}

// The text that represents an item: what it is, where it sits, what it asks.
export async function itemSourceText(itemId) {
  const { rows } = await query(
    `SELECT li.title, li.item_type, t.name AS topic, p.name AS parent_topic,
            (SELECT string_agg(q.question_text, ' ' ORDER BY q.question_no)
             FROM question q WHERE q.quiz_id = li.item_id) AS questions,
            (SELECT string_agg(pt.tech, ', ' ORDER BY pt.tech)
             FROM project_tech pt WHERE pt.item_id = li.item_id) AS tech
     FROM learning_item li
     LEFT JOIN topic t ON t.topic_id = li.topic_id
     LEFT JOIN topic p ON p.topic_id = t.parent_topic_id
     WHERE li.item_id = $1`,
    [itemId]
  );
  if (rows.length === 0) return null;
  const item = rows[0];
  return [
    `${item.title} (${item.item_type.toLowerCase()})`,
    item.topic && `Topic: ${item.topic}${item.parent_topic ? `, part of ${item.parent_topic}` : ""}.`,
    item.questions && `Questions: ${item.questions}`,
    item.tech && `Technologies: ${item.tech}.`,
  ]
    .filter(Boolean)
    .join(" ");
}

export async function refreshItemEmbedding(itemId) {
  const text = await itemSourceText(itemId);
  if (text === null) return false;
  const vector = await embedText(text);
  await query(
    `INSERT INTO item_embedding (item_id, embedding, model, source_text, updated_at)
     VALUES ($1, $2::vector, $3, $4, LOCALTIMESTAMP)
     ON CONFLICT (item_id) DO UPDATE SET
       embedding = EXCLUDED.embedding, model = EXCLUDED.model,
       source_text = EXCLUDED.source_text, updated_at = EXCLUDED.updated_at`,
    [itemId, toVectorLiteral(vector), EMBEDDING_MODEL, text]
  );
  return true;
}

export async function refreshAllEmbeddings() {
  const { rows } = await query("SELECT item_id FROM learning_item ORDER BY item_id");
  for (const { item_id } of rows) {
    await refreshItemEmbedding(item_id);
  }
  return rows.length;
}

// Called after item or question changes. Runs in the background so API
// responses never wait on the model; failures are logged, not thrown.
export function refreshInBackground(itemId) {
  vectorsAvailable()
    .then((ready) => (ready ? refreshItemEmbedding(itemId) : false))
    .catch((error) => console.error(`Embedding refresh failed for item ${itemId}:`, error.message));
}
