// Runs the Phase 2 SQL scripts against DATABASE_URL.
//   npm run db:setup   -> schema.sql + seed.sql, then prints verify.sql output
//   npm run db:schema  -> schema.sql only (empty tables)
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
} catch (error) {
  console.error("Database setup failed:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
