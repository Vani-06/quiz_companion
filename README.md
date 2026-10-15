# Quiz Companion (Adaptive Learning Platform)

BACSE202 course project: React front end, Express API and a PostgreSQL database.

## Setup

1. Create a database: `createdb quiz_companion`
2. Copy `.env.example` to `.env.local` and set `DATABASE_URL` (your PostgreSQL password).
3. `npm install`
4. `npm run db:setup` runs `db/schema.sql` (10 tables) and `db/seed.sql` (36 sample rows).
5. `npm run dev:all` starts the API on :3000 and the web app on :5173.

## Layout

- `db/` DDL (`schema.sql`), sample data (`seed.sql`), checks (`verify.sql`)
- `server/` Express + `pg` API (retrieval and INSERT / UPDATE / DELETE)
- `src/` React pages: Dashboard, My Learning, Quizzes, Learning Items, Topics
- `docs/` completed Phase 2 deck and the script that built it

Business logic (functions, triggers, views) is not in this branch yet.
