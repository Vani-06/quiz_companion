# Quiz Companion (Adaptive Learning Platform)

BACSE202 course project: React front end, Express API and a PostgreSQL database.

## Setup

1. Create a database: `createdb quiz_companion`
2. Copy `.env.example` to `.env.local` and set `DATABASE_URL` (your PostgreSQL password).
3. `npm install`
4. `npm run db:setup` runs `db/schema.sql` (10 tables), `db/seed.sql` (36 sample rows) and `db/business_logic.sql` (constraints, functions, triggers, views).
5. `npm run dev:all` starts the API on :3000 and the web app on :5173.

## Layout

- `db/` DDL (`schema.sql`), sample data (`seed.sql`), business logic (`business_logic.sql`), checks (`verify.sql`, `business_logic_tests.sql`)
- `server/` Express + `pg` API (retrieval and INSERT / UPDATE / DELETE)
- `src/` React pages: Dashboard, My Learning, Quizzes, Learning Items, Topics
- `docs/` completed Phase 2 deck and the script that built it

Remaining backend work and who owns it: [docs/BACKEND_PLAN.md](docs/BACKEND_PLAN.md).
