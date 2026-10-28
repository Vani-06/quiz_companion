# Quiz Companion (Adaptive Learning Platform)

BACSE202 course project: React front end, Express API, Java JDBC client and a PostgreSQL database.

## Setup

1. Create a database: `createdb quiz_companion`
2. Copy `.env.example` to `.env` and set `DATABASE_URL` (your PostgreSQL password). `.env.local` also works and overrides `.env`; both are git-ignored.
3. `npm install`
4. `npm run db:setup` runs `db/schema.sql` (10 tables), `db/seed.sql` (36 sample rows), `db/business_logic.sql` (constraints, functions, triggers, views), `db/indexes.sql`, `db/seed_more.sql` (extra students, topics, items and attempts) and, when pgvector is installed, `db/vectors.sql` plus item embeddings.
5. `npm run dev:all` starts the API on :3000 and the web app on :5173.

## Recommendations

"Refresh recommendations" on the dashboard combines two methods:

- **Weak topics** (`generate_recommendations`, always on): every item in a topic the student scored below 70 in, ranked by how weak the topic is.
- **Similar items** (`generate_similar_recommendations`, needs pgvector): each learning item is embedded as a 384-number vector of its title, topic, questions and technologies using the local `all-MiniLM-L6-v2` model. A student's profile is the average of the items they attempted, weighted towards low scores. Unattempted items closest to that profile are recommended, with the item they found hard as the reason.

To enable similar items:

1. Install the [pgvector](https://github.com/pgvector/pgvector) extension for your PostgreSQL version (on Windows, use a prebuilt release or build it with Visual Studio as described in the pgvector README).
2. Run `npm run db:setup` again. It applies `db/vectors.sql` and embeds every item. The first run downloads the model (about 23 MB) from Hugging Face.
3. Items are re-embedded automatically when they or their questions change. `npm run db:embed` re-embeds everything.

Without pgvector the app still works and only uses weak-topic recommendations.

## Tests

The API tests drop and recreate every table, so point them at a separate database:

1. `createdb quiz_companion_test`
2. Add `TEST_DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/quiz_companion_test` to `.env`
3. `npm test`

SQL-level checks for the business rules are in `db/business_logic_tests.sql` (they roll back, so they are safe on the main database).

## JDBC client

`jdbc/JdbcDemo.java` connects over JDBC and runs retrieval, DML and the business-logic functions. See [jdbc/README.md](jdbc/README.md).

## ODBC client

`odbc/OdbcDemo.ps1` connects through the PostgreSQL ODBC driver and runs the same operations. See [odbc/README.md](odbc/README.md).

## Layout

- `db/` DDL (`schema.sql`), sample data (`seed.sql`, `seed_more.sql`), business logic (`business_logic.sql`), indexes (`indexes.sql`), vector search (`vectors.sql`), checks (`verify.sql`, `business_logic_tests.sql`)
- `server/` Express + `pg` API: `app.js` (core routes), `routes/` (learning flow, auth, update/delete), `validation.js` and `inputs.js` (request validation), `embeddings.js` (item embeddings)
- `src/` React pages: Dashboard, My Learning, Quizzes (take quiz and question bank), Leaderboard, Learning Items, Topics, Account
- `test/` API and vector recommendation tests (`node:test`)
- `jdbc/` Java JDBC console client
- `odbc/` PowerShell ODBC console client
- `docs/` Phase 2 deck, its build script and the backend work plan

Who built what: [docs/BACKEND_PLAN.md](docs/BACKEND_PLAN.md).
