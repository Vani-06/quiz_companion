# Quiz Companion (Adaptive Learning Platform)

BACSE202 course project: React front end, Express API, Java JDBC client and a PostgreSQL database.

## Setup

1. Create a database: `createdb quiz_companion`
2. Copy `.env.example` to `.env.local` and set `DATABASE_URL` (your PostgreSQL password).
3. `npm install`
4. `npm run db:setup` runs `db/schema.sql` (10 tables), `db/seed.sql` (36 sample rows), `db/business_logic.sql` (constraints, functions, triggers, views) and `db/indexes.sql`.
5. `npm run dev:all` starts the API on :3000 and the web app on :5173.

## Tests

The API tests drop and recreate every table, so point them at a separate database:

1. `createdb quiz_companion_test`
2. Add `TEST_DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/quiz_companion_test` to `.env.local`
3. `npm test`

SQL-level checks for the business rules are in `db/business_logic_tests.sql` (they roll back, so they are safe on the main database).

## JDBC client

`jdbc/JdbcDemo.java` connects over JDBC and runs retrieval, DML and the business-logic functions. See [jdbc/README.md](jdbc/README.md).

## Layout

- `db/` DDL (`schema.sql`), sample data (`seed.sql`), business logic (`business_logic.sql`), indexes (`indexes.sql`), checks (`verify.sql`, `business_logic_tests.sql`)
- `server/` Express + `pg` API: `app.js` (core routes), `routes/` (learning flow, auth, update/delete), `validation.js` and `inputs.js` (request validation)
- `src/` React pages: Dashboard, My Learning, Quizzes (take quiz and question bank), Leaderboard, Learning Items, Topics, Account
- `test/` API tests (`node:test`)
- `jdbc/` Java JDBC console client
- `docs/` Phase 2 deck, its build script and the backend work plan

Who built what: [docs/BACKEND_PLAN.md](docs/BACKEND_PLAN.md).
