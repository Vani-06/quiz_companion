-- Adaptive Learning Platform: extra sample data for recommendations
-- Adds 2 students, 4 topics, 13 learning items with questions and attempts.
-- Run after schema.sql, seed.sql and business_logic.sql. Safe to re-run: rows are
-- matched by email, topic name or item title, so nothing is inserted twice.
-- Attempts go in after business_logic.sql, so the proficiency trigger fills
-- topic_proficiency from them.

-- Students -------------------------------------------------------------------

INSERT INTO users (full_name, email, password_hash, skill_level, created_at) VALUES
  ('Kabir Nair',  'kabir@example.edu', 'demo_hash_004', 'Beginner',     '2026-10-07 09:00:00'),
  ('Sara Thomas', 'sara@example.edu',  'demo_hash_005', 'Intermediate', '2026-10-07 09:20:00')
ON CONFLICT (email) DO NOTHING;

-- Topics ---------------------------------------------------------------------

INSERT INTO topic (name, description, parent_topic_id)
SELECT v.name, v.descr, (SELECT topic_id FROM topic WHERE name = v.parent)
FROM (VALUES
  ('Linked Lists',      'Nodes, pointers and traversal',            'Programming Fundamentals'),
  ('Stacks and Queues', 'LIFO and FIFO structures',                 'Programming Fundamentals'),
  ('Recursion',         'Functions that call themselves',           'Programming Fundamentals'),
  ('Normalization',     '1NF, 2NF and 3NF',                         'Database Systems'),
  ('Indexing',          'B-trees, hash indexes and query speed',    'Database Systems'),
  ('Transactions',      'ACID properties and concurrency control',  'Database Systems')
) AS v(name, descr, parent)
ON CONFLICT (name) DO NOTHING;

-- Learning items -------------------------------------------------------------

INSERT INTO learning_item (topic_id, title, difficulty, item_type, created_at)
SELECT (SELECT topic_id FROM topic WHERE name = v.topic), v.title, v.diff, v.kind, v.created::timestamp
FROM (VALUES
  ('Linked Lists',      'Linked List Basics',       3, 'QUIZ',    '2026-10-07 10:00:00'),
  ('Normalization',     'Normal Forms Quiz',        3, 'QUIZ',    '2026-10-07 10:15:00'),
  ('Linked Lists',      'Linked List Visualiser',   3, 'PROJECT', '2026-10-07 11:00:00'),
  ('SQL Queries',       'SQL Report Builder',       4, 'PROJECT', '2026-10-07 11:30:00'),
  ('Stacks and Queues', 'Stack Operations',         2, 'QUIZ',    '2026-10-08 09:00:00'),
  ('Stacks and Queues', 'Queue Simulator',          3, 'PROJECT', '2026-10-08 09:30:00'),
  ('Recursion',         'Recursion Fundamentals',   3, 'QUIZ',    '2026-10-08 10:00:00'),
  ('SQL Queries',       'Aggregate Functions',      2, 'QUIZ',    '2026-10-08 10:30:00'),
  ('SQL Queries',       'Subqueries Practice',      4, 'QUIZ',    '2026-10-08 11:00:00'),
  ('Indexing',          'B-Tree Indexes',           4, 'QUIZ',    '2026-10-08 11:30:00'),
  ('Transactions',      'ACID Properties',          3, 'QUIZ',    '2026-10-08 12:00:00'),
  ('Transactions',      'Bank Transfer Simulator',  4, 'PROJECT', '2026-10-08 12:30:00'),
  ('Arrays',            'Array Searching',          2, 'QUIZ',    '2026-10-08 13:00:00')
) AS v(topic, title, diff, kind, created)
WHERE NOT EXISTS (SELECT 1 FROM learning_item li WHERE li.title = v.title);

INSERT INTO quiz (item_id, time_limit_min, pass_mark)
SELECT li.item_id, v.mins, v.pass
FROM (VALUES
  ('Linked List Basics',     15, 60),
  ('Normal Forms Quiz',      20, 70),
  ('Stack Operations',       10, 60),
  ('Recursion Fundamentals', 20, 60),
  ('Aggregate Functions',    15, 60),
  ('Subqueries Practice',    25, 70),
  ('B-Tree Indexes',         20, 70),
  ('ACID Properties',        15, 70),
  ('Array Searching',        15, 60)
) AS v(title, mins, pass)
JOIN learning_item li ON li.title = v.title
ON CONFLICT (item_id) DO NOTHING;

INSERT INTO project (item_id, est_hours, repo_url)
SELECT li.item_id, v.hours, v.url
FROM (VALUES
  ('Linked List Visualiser',   6.0, 'https://github.com/example/list-visualiser'),
  ('SQL Report Builder',      10.0, 'https://github.com/example/sql-report'),
  ('Queue Simulator',          5.0, 'https://github.com/example/queue-simulator'),
  ('Bank Transfer Simulator',  8.0, 'https://github.com/example/bank-transfer')
) AS v(title, hours, url)
JOIN learning_item li ON li.title = v.title
ON CONFLICT (item_id) DO NOTHING;

INSERT INTO project_tech (item_id, tech)
SELECT li.item_id, v.tech
FROM (VALUES
  ('Linked List Visualiser',  'JavaScript'), ('Linked List Visualiser',  'React'),
  ('SQL Report Builder',      'PostgreSQL'), ('SQL Report Builder',      'Python'),
  ('Queue Simulator',         'Python'),
  ('Bank Transfer Simulator', 'PostgreSQL'), ('Bank Transfer Simulator', 'Java')
) AS v(title, tech)
JOIN learning_item li ON li.title = v.title
ON CONFLICT DO NOTHING;

-- Questions ------------------------------------------------------------------

INSERT INTO question (quiz_id, question_no, question_text, correct_answer, marks)
SELECT li.item_id, v.no, v.q, v.a, v.marks
FROM (VALUES
  ('Linked List Basics', 1, 'What does each node in a singly linked list store?', 'Data and next pointer', 2),
  ('Linked List Basics', 2, 'What is the time complexity of inserting at the head?', 'O(1)', 3),
  ('Normal Forms Quiz', 1, 'Which normal form removes partial dependencies?', '2NF', 2),
  ('Normal Forms Quiz', 2, 'Which normal form removes transitive dependencies?', '3NF', 3),
  ('Stack Operations', 1, 'Which operation removes the top element of a stack?', 'pop', 2),
  ('Stack Operations', 2, 'Is a stack LIFO or FIFO?', 'LIFO', 2),
  ('Recursion Fundamentals', 1, 'What stops a recursive function from calling itself forever?', 'Base case', 3),
  ('Recursion Fundamentals', 2, 'Which data structure holds the frames of recursive calls?', 'Call stack', 2),
  ('Aggregate Functions', 1, 'Which aggregate counts rows?', 'COUNT', 2),
  ('Aggregate Functions', 2, 'Which clause groups rows before aggregating?', 'GROUP BY', 2),
  ('Subqueries Practice', 1, 'Which keyword tests whether a subquery returns any row?', 'EXISTS', 3),
  ('Subqueries Practice', 2, 'What is a subquery that refers to the outer query called?', 'Correlated subquery', 3),
  ('B-Tree Indexes', 1, 'Which index type supports range queries in PostgreSQL by default?', 'B-tree', 3),
  ('B-Tree Indexes', 2, 'Does an index speed up reads or writes?', 'Reads', 2),
  ('ACID Properties', 1, 'Which ACID property means all or nothing?', 'Atomicity', 2),
  ('ACID Properties', 2, 'Which ACID property keeps committed data after a crash?', 'Durability', 2),
  ('Array Searching', 1, 'Which search needs a sorted array?', 'Binary search', 2),
  ('Array Searching', 2, 'What is the worst-case time of linear search?', 'O(n)', 3)
) AS v(title, no, q, a, marks)
JOIN learning_item li ON li.title = v.title
ON CONFLICT DO NOTHING;

-- Attempts -------------------------------------------------------------------
-- These build distinct learning histories: Kabir struggles with arrays and
-- linked lists, Sara with SQL queries, Maya does well across databases.

INSERT INTO learning_record (user_id, item_id, attempt_no, status, score, started_at, completed_at)
SELECT u.user_id, li.item_id, v.no, v.status, v.score, v.s::timestamp, v.c::timestamp
FROM (VALUES
  ('kabir@example.edu', 'Linked List Basics',     1, 'completed', 50.00, '2026-10-09 10:00:00', '2026-10-09 10:14:00'),
  ('kabir@example.edu', 'Array Basics',           1, 'completed', 45.00, '2026-10-09 11:00:00', '2026-10-09 11:12:00'),
  ('kabir@example.edu', 'Stack Operations',       1, 'completed', 80.00, '2026-10-10 09:00:00', '2026-10-10 09:08:00'),
  ('sara@example.edu',  'Normal Forms Quiz',      1, 'completed', 90.00, '2026-10-09 14:00:00', '2026-10-09 14:18:00'),
  ('sara@example.edu',  'SQL Joins',              1, 'completed', 65.00, '2026-10-10 09:00:00', '2026-10-10 09:19:00'),
  ('sara@example.edu',  'Aggregate Functions',    1, 'completed', 50.00, '2026-10-10 10:00:00', '2026-10-10 10:12:00'),
  ('maya@example.edu',  'Normal Forms Quiz',      1, 'completed', 95.00, '2026-10-10 15:00:00', '2026-10-10 15:16:00'),
  ('maya@example.edu',  'ACID Properties',        1, 'completed', 85.00, '2026-10-11 09:00:00', '2026-10-11 09:12:00'),
  ('arjun@example.edu', 'Recursion Fundamentals', 1, 'completed', 60.00, '2026-10-11 10:00:00', '2026-10-11 10:18:00')
) AS v(email, title, no, status, score, s, c)
JOIN users u ON u.email = v.email
JOIN learning_item li ON li.title = v.title
ON CONFLICT DO NOTHING;
