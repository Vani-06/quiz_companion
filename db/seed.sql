-- Adaptive Learning Platform: Phase 2 DML (sample data for all 10 tables, 36 rows)
-- Run after schema.sql on an empty database. Item IDs below assume sequences start at 1.
-- Parent rows are inserted before the rows that reference them.

-- Strong entities ------------------------------------------------------------

INSERT INTO users
  (full_name, email, password_hash, skill_level, created_at)
VALUES
  ('Riya Sharma', 'riya@example.edu',  'demo_hash_001', 'Beginner',     '2026-10-01 09:00:00'),
  ('Arjun Mehta', 'arjun@example.edu', 'demo_hash_002', 'Intermediate', '2026-10-01 09:15:00'),
  ('Maya Iyer',   'maya@example.edu',  'demo_hash_003', 'Advanced',     '2026-10-01 09:30:00');

-- Parent topics first
INSERT INTO topic (name, description, parent_topic_id)
VALUES
  ('Programming Fundamentals', 'Core programming concepts',    NULL),
  ('Database Systems',         'Relational database concepts', NULL);

-- Then child topics
INSERT INTO topic (name, description, parent_topic_id)
VALUES
  ('Arrays',      'Array operations and traversal',   1),
  ('SQL Queries', 'Filtering, joins and aggregation', 2);

-- Learning items and subclasses ---------------------------------------------

INSERT INTO learning_item (topic_id, title, difficulty, item_type, created_at)
VALUES
  (3, 'Array Basics',         2, 'QUIZ',    '2026-10-02 10:00:00'),
  (4, 'SQL Joins',            3, 'QUIZ',    '2026-10-02 10:15:00'),
  (2, 'Student Task Tracker', 4, 'PROJECT', '2026-10-02 11:00:00'),
  (3, 'Array Practice Lab',   2, 'PROJECT', '2026-10-02 11:30:00');

INSERT INTO quiz (item_id, time_limit_min, pass_mark)
VALUES
  (1, 15, 60),
  (2, 20, 70);

INSERT INTO project (item_id, est_hours, repo_url)
VALUES
  (3, 8.0, 'https://github.com/example/task-tracker'),
  (4, 4.5, 'https://github.com/example/array-practice');

-- Multivalued attribute and weak entity --------------------------------------

INSERT INTO project_tech (item_id, tech)
VALUES
  (3, 'Python'),
  (3, 'PostgreSQL'),
  (4, 'Python'),
  (4, 'Git');

INSERT INTO question (quiz_id, question_no, question_text, correct_answer, marks)
VALUES
  (1, 1, 'What is the first index of an array?',            '0',         2),
  (1, 2, 'What is the process of visiting array elements?', 'Traversal', 3),
  (2, 1, 'Which SQL operation combines matching rows?',     'JOIN',      2),
  (2, 2, 'Which clause filters grouped results?',           'HAVING',    3);

-- Many-to-many relationships -------------------------------------------------

INSERT INTO learning_record
  (user_id, item_id, attempt_no, status, score, started_at, completed_at)
VALUES
  (1, 1, 1, 'completed', 85.00, '2026-10-03 10:00:00', '2026-10-03 10:15:00'),
  (1, 2, 1, 'completed', 55.00, '2026-10-03 11:00:00', '2026-10-03 11:20:00'),
  (2, 1, 1, 'completed', 62.00, '2026-10-04 09:00:00', '2026-10-04 09:15:00'),
  (2, 1, 2, 'completed', 82.00, '2026-10-05 09:00:00', '2026-10-05 09:15:00'),
  (3, 3, 1, 'submitted', 90.00, '2026-10-05 14:00:00', '2026-10-05 16:00:00');

INSERT INTO topic_proficiency
  (user_id, topic_id, proficiency_score, attempts_count, last_updated)
VALUES
  (1, 3, 85.00, 1, '2026-10-05 10:00:00'),
  (1, 4, 55.00, 1, '2026-10-03 11:20:00'),
  (2, 3, 82.00, 2, '2026-10-05 09:15:00'),
  (3, 2, 90.00, 1, '2026-10-05 16:00:00');

INSERT INTO recommendation
  (user_id, item_id, rank_score, reason, status, created_at)
VALUES
  (1, 2, 0.9700, 'Low proficiency in SQL Queries',         'active', '2026-10-06 09:00:00'),
  (1, 4, 0.8200, 'Additional array practice',              'active', '2026-10-06 09:00:00'),
  (2, 3, 0.9000, 'Practice through a programming project', 'active', '2026-10-06 09:05:00'),
  (3, 2, 0.7500, 'Strengthen SQL query skills',            'active', '2026-10-06 09:10:00');
