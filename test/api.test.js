import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { resetDatabase, startServer } from "./helpers.js";

let api;

before(async () => {
  api = await startServer();
});

beforeEach(async () => {
  await resetDatabase();
});

after(async () => {
  await api.close();
});

describe("connectivity and retrieval", () => {
  test("health check reaches the database", async () => {
    const { status, body } = await api.get("/health");
    assert.equal(status, 200);
    assert.equal(body.database, "connected");
  });

  test("dashboard summarises a student's seeded activity", async () => {
    const { status, body } = await api.get("/dashboard?userId=1");
    assert.equal(status, 200);
    assert.equal(body.user.full_name, "Riya Sharma");
    assert.equal(body.summary.attempts, 2);
    assert.equal(body.summary.average_score, 70);
    assert.equal(body.recommendations.length, 2);
  });

  test("dashboard requires a valid user", async () => {
    assert.equal((await api.get("/dashboard")).status, 400);
    assert.equal((await api.get("/dashboard?userId=99")).status, 404);
  });

  test("items list includes subclass details and technologies", async () => {
    const { body } = await api.get("/items");
    assert.equal(body.length, 4);
    const tracker = body.find((item) => item.title === "Student Task Tracker");
    assert.deepEqual(tracker.tech, ["PostgreSQL", "Python"]);
    assert.equal(tracker.est_hours, 8);
  });
});

describe("topics CRUD", () => {
  test("creates, updates and deletes a topic", async () => {
    const created = await api.post("/topics", { name: "Graphs", parent_topic_id: 1 });
    assert.equal(created.status, 201);

    const updated = await api.put(`/topics/${created.body.topic_id}`, {
      name: "Graph Algorithms", description: "BFS and DFS", parent_topic_id: 1,
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.name, "Graph Algorithms");

    assert.equal((await api.del(`/topics/${created.body.topic_id}`)).status, 204);
  });

  test("rejects duplicate names through the unique constraint", async () => {
    const { status, body } = await api.post("/topics", { name: "Arrays" });
    assert.equal(status, 409);
    assert.match(body.error, /unique/);
  });

  test("rejects a missing name and a topic that is its own parent", async () => {
    assert.equal((await api.post("/topics", { name: "  " })).status, 400);
    const { status, body } = await api.put("/topics/3", { name: "Arrays", parent_topic_id: 3 });
    assert.equal(status, 400);
    assert.match(body.error, /own parent/);
  });

  test("blocks deleting a topic that still has learning items", async () => {
    const { status, body } = await api.del("/topics/3");
    assert.equal(status, 409);
    assert.equal(body.error, "Topic 3 still has learning items");
  });
});

describe("learning items CRUD", () => {
  test("creates a project with technologies and updates them", async () => {
    const created = await api.post("/items", {
      item_type: "PROJECT", title: "Graph Explorer", topic_id: 1, difficulty: 3,
      est_hours: 5, repo_url: "https://github.com/example/graph", tech: "Python, Git, Python",
    });
    assert.equal(created.status, 201);
    const itemId = created.body.item_id;

    const updated = await api.put(`/items/${itemId}`, {
      title: "Graph Explorer v2", topic_id: 1, difficulty: 4, est_hours: 6, tech: ["React"],
    });
    assert.equal(updated.status, 200);

    const item = (await api.get("/items")).body.find((row) => row.item_id === itemId);
    assert.equal(item.title, "Graph Explorer v2");
    assert.deepEqual(item.tech, ["React"]);
  });

  test("validates difficulty, type and repository URL", async () => {
    const base = { title: "Bad", topic_id: 1 };
    assert.equal((await api.post("/items", { ...base, item_type: "QUIZ", difficulty: 6 })).status, 400);
    assert.equal((await api.post("/items", { ...base, item_type: "VIDEO" })).status, 400);
    assert.equal(
      (await api.post("/items", { ...base, item_type: "PROJECT", repo_url: "ftp://x" })).status,
      400
    );
  });

  test("deletes an unused item but not one with attempts", async () => {
    const created = await api.post("/items", { item_type: "QUIZ", title: "Temp", topic_id: 3 });
    assert.equal((await api.del(`/items/${created.body.item_id}`)).status, 204);

    const blocked = await api.del("/items/1");
    assert.equal(blocked.status, 409);
    assert.match(blocked.body.error, /foreign key/);
  });

  test("returns 404 when updating a missing item", async () => {
    assert.equal((await api.put("/items/999", { title: "X", topic_id: 1 })).status, 404);
  });
});

describe("questions CRUD", () => {
  test("adds, edits and deletes a question", async () => {
    const added = await api.post("/quizzes/1/questions", {
      question_text: "Index of the last element in an array of length n?",
      correct_answer: "n-1", marks: 2,
    });
    assert.equal(added.status, 201);
    assert.equal(added.body.question_no, 3);

    const edited = await api.put("/quizzes/1/questions/3", {
      question_text: "Last index for length n?", correct_answer: "n - 1", marks: 1,
    });
    assert.equal(edited.status, 200);
    assert.equal(edited.body.marks, 1);

    assert.equal((await api.del("/quizzes/1/questions/3")).status, 204);
    assert.equal((await api.del("/quizzes/1/questions/3")).status, 404);
  });

  test("the quiz paper hides correct answers", async () => {
    const { body } = await api.get("/quizzes/1/paper");
    assert.equal(body.questions.length, 2);
    assert.ok(body.questions.every((q) => !("correct_answer" in q)));
  });
});

describe("business rules through the API", () => {
  test("grades a quiz, numbers the attempt and updates proficiency", async () => {
    const { status, body } = await api.post("/quizzes/1/attempts", {
      userId: 2, answers: { 1: "0", 2: " TRAVERSAL " },
    });
    assert.equal(status, 201);
    assert.deepEqual(body, { score: 100, pass_mark: 60, passed: true, attempt_no: 3 });

    const strengths = (await api.get("/users/2/strengths")).body;
    assert.equal(strengths.find((row) => row.topic === "Arrays").proficiency_score, 100);
  });

  test("a failed quiz creates a weak topic that gets recommendations", async () => {
    const attempt = await api.post("/quizzes/2/attempts", { userId: 2, answers: { 1: "JOIN" } });
    assert.equal(attempt.body.score, 40);
    assert.equal(attempt.body.passed, false);

    const generated = await api.post("/users/2/recommendations/generate");
    assert.equal(generated.body.added, 1);
  });

  test("rejects a project score outside 0-100 with the check constraint", async () => {
    const { status, body } = await api.post("/projects/3/submissions", { userId: 1, score: 120 });
    assert.equal(status, 400);
    assert.match(body.error, /check constraint/);
  });

  test("records project submissions without a score", async () => {
    const { status, body } = await api.post("/projects/4/submissions", { userId: 3 });
    assert.equal(status, 201);
    assert.equal(body.attempt_no, 1);
  });

  test("leaderboard ranks students by their best scores", async () => {
    const { body } = await api.get("/leaderboard");
    assert.deepEqual(
      body.map((row) => [row.rank, row.full_name, row.total_score]),
      [[1, "Riya Sharma", 140], [2, "Maya Iyer", 90], [3, "Arjun Mehta", 82]]
    );
  });

  test("recommendation status changes are limited to known values", async () => {
    assert.equal((await api.patch("/recommendations/1/2", { status: "completed" })).status, 200);
    assert.equal((await api.patch("/recommendations/1/2", { status: "maybe" })).status, 400);
  });
});

describe("accounts and users", () => {
  const account = { name: "Test Student", email: "Test.Student@Example.edu", password: "longenough" };

  test("registers a Beginner and signs in with the same password", async () => {
    const registered = await api.post("/auth/register", account);
    assert.equal(registered.status, 201);
    assert.equal(registered.body.email, "test.student@example.edu");
    assert.equal(registered.body.skill_level, "Beginner");
    assert.ok(!("password_hash" in registered.body));

    const login = await api.post("/auth/login", { email: account.email, password: account.password });
    assert.equal(login.status, 200);
    assert.equal(login.body.user_id, registered.body.user_id);
  });

  test("rejects wrong passwords, short passwords and duplicate emails", async () => {
    await api.post("/auth/register", account);
    assert.equal((await api.post("/auth/login", { email: account.email, password: "wrong-one" })).status, 401);
    assert.equal((await api.post("/auth/register", { ...account, email: "x@y.edu", password: "short" })).status, 400);
    assert.equal((await api.post("/auth/register", account)).status, 409);
  });

  test("updates a profile and validates the skill level", async () => {
    const updated = await api.put("/users/1", { full_name: "Riya S.", skill_level: "Intermediate" });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.skill_level, "Intermediate");
    assert.equal((await api.put("/users/1", { full_name: "Riya", skill_level: "Expert" })).status, 400);
  });

  test("deleting a user removes their records too", async () => {
    assert.equal((await api.del("/users/1")).status, 204);
    assert.equal((await api.get("/users/1")).status, 404);
    const board = (await api.get("/leaderboard")).body;
    assert.ok(board.every((row) => row.user_id !== 1));
  });
});

describe("error handling", () => {
  test("malformed JSON returns 400", async () => {
    const { status, body } = await api.post("/topics", "{not json");
    assert.equal(status, 400);
    assert.equal(body.error, "Request body is not valid JSON");
  });

  test("invalid ids return 400", async () => {
    assert.equal((await api.put("/topics/abc", { name: "X" })).status, 400);
    assert.equal((await api.del("/users/0")).status, 400);
  });
});
