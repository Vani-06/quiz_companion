# Backend work plan

How the backend work was split across three people, and what each package delivered.
Roles follow the course's three team roles. Each package is sized to take roughly the same effort,
and each person owns separate files so the three branches don't conflict.

## Done on `dev`

| Area | Where |
|---|---|
| DDL for the 10 tables (keys, FKs, domain checks) | `db/schema.sql` |
| Sample data, 36 rows | `db/seed.sql` |
| Verification queries | `db/verify.sql` |
| Express + `pg` API: retrieval, add/delete topics and items, add questions, update recommendation status | `server/index.js` |
| React pages reading live data | `src/pages/` |
| Business logic: validation checks, `record_attempt`, `grade_quiz`, proficiency trigger, `v_topic_strength`, `generate_recommendations`, `v_leaderboard`, `register_user`, topic-delete guard | `db/business_logic.sql`, tests in `db/business_logic_tests.sql` |

## Status

All three packages are merged into `dev`. Remaining before Phase 3: run `npm run db:setup` and `npm test` on the team's own PostgreSQL, take screenshots for the report, and merge `dev` into `main`.

## Who does what

### Person 1: Database Designer (done in `feat/db-business-logic`)

This was the most important package because everything else calls it.

- Validation constraints, functions, triggers and views in `db/business_logic.sql`
- `npm run db:setup` runs it after the seed
- SQL checks for each rule in `db/business_logic_tests.sql`
- Trigger errors returned to the API as readable 409 messages

**Next for this role:** indexes for the common lookups (`learning_record(user_id)`, `learning_item(topic_id)`), and the Phase 3 report's schema section.

### Person 2: Front-End and Business Logic Developer (done in `feat/learning-flow-api`)

Exposes the business logic through the API and the UI.

- `GET /api/quizzes/:id/paper`: questions without answers, for taking the quiz
- `POST /api/quizzes/:id/attempts`: body `{ userId, answers }`, calls `grade_quiz` then `record_attempt`, returns score and pass/fail
- `POST /api/projects/:id/submissions`: calls `record_attempt` with status `submitted`
- `GET /api/leaderboard` from `v_leaderboard`
- `GET /api/users/:id/strengths` from `v_topic_strength`
- `POST /api/users/:id/recommendations/generate` calls `generate_recommendations`
- `POST /api/auth/register` (hash with `node:crypto` scrypt, then `register_user`) and `POST /api/auth/login`
- UI: a take-quiz screen on the Quizzes page, a project submission form, a Leaderboard page with topic strengths, a recommendation refresh on the dashboard, and an Account page for sign-up and sign-in

Files: new route modules under `server/routes/`, `src/pages/`, `src/services/api.js`.

### Person 3: Integration, Testing and Documentation Lead (done in `feat/crud-and-tests`)

Completes CRUD, adds the JDBC client and proves everything with tests.

- `PUT` routes for topics, learning items (including the quiz/project subtype row and `project_tech`), questions and users; `DELETE` for questions and users
- A shared request-validation helper so every route rejects bad input the same way
- A small Java JDBC console client (`jdbc/`) that connects to the same database and runs SELECT, INSERT, UPDATE and DELETE, for the ODBC/JDBC rubric item
- Automated API tests with `node:test` against a fresh test database: happy paths, constraint violations (bad score, duplicate email, FK blocks) and error responses
- Edit and delete controls in the UI for topics, learning items, questions and the current student
- Test results and screenshots for the Phase 3 report (still to capture on the team's database)

Files: `server/routes/crud.js`, `server/validation.js`, `server/inputs.js`, `jdbc/`, `test/`.

## Order of work

1. `feat/db-business-logic` merged into `dev`.
2. `feat/learning-flow-api` merged into `dev`.
3. `feat/crud-and-tests` merged into `dev`.
4. Next: merge `dev` into `main` for the Phase 3 submission.

## Optional, if time allows

Redis caching for the leaderboard and Qdrant similarity search for recommendations (deck slide 27). Neither is required by the rubric.
