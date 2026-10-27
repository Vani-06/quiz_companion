// Test harness: points the API at TEST_DATABASE_URL, reloads the SQL scripts
// before each test, and serves the app on a random port.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

if (!process.env.TEST_DATABASE_URL) {
  throw new Error(
    "Set TEST_DATABASE_URL to a separate, disposable database. The tests drop and recreate every table."
  );
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
// Keep the API from loading the embedding model during tests.
process.env.EMBEDDINGS_DISABLED = "1";

const { app } = await import("../server/app.js");
const { pool } = await import("../server/db.js");

const scripts = await Promise.all(
  ["schema.sql", "seed.sql", "business_logic.sql", "indexes.sql"].map((name) =>
    readFile(fileURLToPath(new URL(`../db/${name}`, import.meta.url)), "utf8")
  )
);

export async function resetDatabase() {
  for (const sql of scripts) {
    await pool.query(sql);
  }
}

export async function startServer() {
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });
  const base = `http://127.0.0.1:${server.address().port}/api`;

  const call = async (method, path, body) => {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };

  return {
    get: (path) => call("GET", path),
    post: (path, body) => call("POST", path, body ?? {}),
    put: (path, body) => call("PUT", path, body),
    patch: (path, body) => call("PATCH", path, body),
    del: (path) => call("DELETE", path),
    async close() {
      await new Promise((resolve) => server.close(resolve));
      await pool.end();
    },
  };
}
