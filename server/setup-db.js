// Runs the Phase 2 SQL scripts against DATABASE_URL.
//   npm run db:setup   -> schema.sql + seed.sql + business_logic.sql + indexes.sql + seed_more.sql
//                         + vectors.sql (when pgvector is installed), verification output, embeddings
//   npm run db:schema  -> schema.sql + business_logic.sql + indexes.sql (empty tables)
// business_logic.sql runs after the seed so its trigger does not rewrite seeded proficiency rows,
// and before seed_more.sql so the trigger fills proficiency from the extra attempts.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { pool } from "./db.js";

const sqlPath = (name) =>
  fileURLToPath(new URL(`../db/${name}`, import.meta.url));

const schemaOnly = process.argv.includes("--schema-only");

async function run(name) {
  const sql = await readFile(sqlPath(name), "utf8");
  await pool.query(sql);
  console.log(`ran db/${name}`);
}

try {
  await run("schema.sql");
  if (!schemaOnly) await run("seed.sql");
  await run("business_logic.sql");
  await run("indexes.sql");
  if (!schemaOnly) await run("seed_more.sql");

  // Vector recommendations are optional: they need the pgvector extension.
  let vectors = false;
  try {
    await run("vectors.sql");
    vectors = true;
  } catch (error) {
    console.warn(
      `skipped db/vectors.sql (${error.message}). Install pgvector to enable similar-item recommendations.`
    );
  }

  const tables = await pool.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
     ORDER BY table_name`
  );
  console.log(`\n${tables.rowCount} tables:`);
  console.table(tables.rows);

  if (!schemaOnly) {
    const counts = await pool.query(
      `SELECT 'users' AS table_name, COUNT(*)::int AS records FROM users
       UNION ALL SELECT 'topic', COUNT(*) FROM topic
       UNION ALL SELECT 'learning_item', COUNT(*) FROM learning_item
       UNION ALL SELECT 'quiz', COUNT(*) FROM quiz
       UNION ALL SELECT 'project', COUNT(*) FROM project
       UNION ALL SELECT 'project_tech', COUNT(*) FROM project_tech
       UNION ALL SELECT 'question', COUNT(*) FROM question
       UNION ALL SELECT 'learning_record', COUNT(*) FROM learning_record
       UNION ALL SELECT 'topic_proficiency', COUNT(*) FROM topic_proficiency
       UNION ALL SELECT 'recommendation', COUNT(*) FROM recommendation
       ORDER BY table_name`
    );
    console.table(counts.rows);
  }

  if (vectors && !schemaOnly) {
    try {
      const { EMBEDDING_MODEL, refreshAllEmbeddings } = await import("./embeddings.js");
      console.log(`\nEmbedding learning items with ${EMBEDDING_MODEL}...`);
      console.log(`embedded ${await refreshAllEmbeddings()} learning items`);
    } catch (error) {
      console.warn(`embedding skipped (${error.message}). Run npm run db:embed later.`);
    }
  }
} catch (error) {
  console.error("Database setup failed:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
