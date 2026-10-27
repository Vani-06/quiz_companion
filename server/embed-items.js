// Embeds every learning item into item_embedding.
//   npm run db:embed
import { pool } from "./db.js";
import { EMBEDDING_MODEL, refreshAllEmbeddings, vectorsAvailable } from "./embeddings.js";

try {
  if (!(await vectorsAvailable())) {
    console.error("item_embedding is missing. Install pgvector, then run npm run db:setup.");
    process.exitCode = 1;
  } else {
    console.log(`Embedding learning items with ${EMBEDDING_MODEL}...`);
    const count = await refreshAllEmbeddings();
    console.log(`Embedded ${count} learning items.`);
  }
} catch (error) {
  console.error("Embedding failed:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
