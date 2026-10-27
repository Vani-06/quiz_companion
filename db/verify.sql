-- Schema verification: lists the 10 created tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Foreign key count (expected: 12)
SELECT COUNT(*) AS foreign_keys
FROM information_schema.table_constraints
WHERE table_schema = 'public' AND constraint_type = 'FOREIGN KEY';

-- Data population verification (expected total: 36)
SELECT 'users' AS table_name, COUNT(*) AS records FROM users
UNION ALL SELECT 'topic', COUNT(*) FROM topic
UNION ALL SELECT 'learning_item', COUNT(*) FROM learning_item
UNION ALL SELECT 'quiz', COUNT(*) FROM quiz
UNION ALL SELECT 'project', COUNT(*) FROM project
UNION ALL SELECT 'project_tech', COUNT(*) FROM project_tech
UNION ALL SELECT 'question', COUNT(*) FROM question
UNION ALL SELECT 'learning_record', COUNT(*) FROM learning_record
UNION ALL SELECT 'topic_proficiency', COUNT(*) FROM topic_proficiency
UNION ALL SELECT 'recommendation', COUNT(*) FROM recommendation
ORDER BY table_name;

-- Business logic objects (after business_logic.sql)
-- Project functions only: functions installed by extensions such as pgvector are skipped.
SELECT p.proname AS function_name
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND NOT EXISTS (SELECT 1 FROM pg_depend d
                  WHERE d.objid = p.oid AND d.deptype = 'e')
ORDER BY p.proname;

SELECT trigger_name, event_object_table AS on_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY trigger_name;

SELECT table_name AS view_name
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

SELECT indexname AS index_name, tablename AS on_table
FROM pg_indexes
WHERE schemaname = 'public' AND indexname LIKE 'idx_%'
ORDER BY indexname;
