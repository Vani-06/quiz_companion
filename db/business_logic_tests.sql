-- Business rule checks. Run on a database loaded with schema.sql, seed.sql
-- and business_logic.sql. Everything runs in a transaction that is rolled back,
-- so the sample data is left unchanged.

BEGIN;

-- 1. Valid attempt: stored as attempt 1, proficiency updated by the trigger
SELECT record_attempt(1, 3, 'submitted', 88) AS attempt_no;           -- 1
SELECT proficiency_score, attempts_count
FROM topic_proficiency WHERE user_id = 1 AND topic_id = 2;            -- 88.00, 1

-- 2. Attempt numbers are sequential
SELECT record_attempt(1, 3, 'submitted', 92) AS attempt_no;           -- 2

-- 3. Score of 120 is rejected by chk_score
SAVEPOINT bad_score;
SELECT record_attempt(1, 3, 'submitted', 120);                        -- ERROR: chk_score
ROLLBACK TO SAVEPOINT bad_score;

-- 4. Quiz grading
SELECT grade_quiz(1, '{"1": "0", "2": "Traversal"}') AS score;        -- 100.00
SELECT grade_quiz(1, '{"1": "1", "2": "traversal"}') AS score;        -- 60.00
SELECT grade_quiz(1, '{"1": "0", "2": "Traversal"}') >= pass_mark AS passed
FROM quiz WHERE item_id = 1;                                          -- true

-- 5. Weak topic produces a recommendation
SELECT record_attempt(2, 2, 'completed', 45) AS attempt_no;           -- 1
SELECT * FROM v_topic_strength WHERE user_id = 2 ORDER BY topic;      -- SQL Queries = Weak
SELECT generate_recommendations(2) AS added;                          -- 1
SELECT item_id, rank_score, reason
FROM recommendation WHERE user_id = 2 ORDER BY rank_score DESC;       -- item 2, 0.5500

-- 6. Leaderboard
SELECT * FROM v_leaderboard ORDER BY rank;

-- 7. Registration: new students start as Beginner; duplicate emails fail
SELECT register_user('Test Student', 'Test@Example.edu', 'hash') AS user_id;
SELECT skill_level FROM users WHERE email = 'test@example.edu';       -- Beginner
SAVEPOINT dup_email;
SELECT register_user('Copy', 'test@example.edu', 'hash');             -- ERROR: unique
ROLLBACK TO SAVEPOINT dup_email;

-- 8. A topic with learning items cannot be deleted
SAVEPOINT del_topic;
DELETE FROM topic WHERE topic_id = 3;                                 -- ERROR: still has items
ROLLBACK TO SAVEPOINT del_topic;

ROLLBACK;
