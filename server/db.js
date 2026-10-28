import pg from "pg";

// Connection settings come from DATABASE_URL (see .env.example).
// pg.Pool is the Node equivalent of a JDBC/ODBC connection pool.
export const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgres://postgres@localhost:5432/quiz_companion",
  max: Number(process.env.DB_POOL_MAX) || 10,
});

export const query = (text, params) => pool.query(text, params);
