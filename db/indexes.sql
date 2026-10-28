-- Adaptive Learning Platform: indexes for frequent lookups (PostgreSQL)
-- Primary keys already index their leading columns (for example learning_record
-- by user_id). These cover the remaining foreign keys that are searched or
-- checked on delete. Safe to re-run.

-- Items by topic: topic pages, the proficiency trigger, generate_recommendations()
-- and the topic-delete guard all look items up by topic_id.
CREATE INDEX IF NOT EXISTS idx_learning_item_topic
  ON learning_item (topic_id);

-- Child topics by parent: the topic hierarchy and parent-delete FK checks.
CREATE INDEX IF NOT EXISTS idx_topic_parent
  ON topic (parent_topic_id);

-- Attempts by item: FK checks when an item is deleted, per-item history.
CREATE INDEX IF NOT EXISTS idx_learning_record_item
  ON learning_record (item_id);

-- Recommendations by item: FK checks when an item is deleted.
CREATE INDEX IF NOT EXISTS idx_recommendation_item
  ON recommendation (item_id);

-- Proficiency by topic: FK checks when a topic is deleted, topic-level reports.
CREATE INDEX IF NOT EXISTS idx_topic_proficiency_topic
  ON topic_proficiency (topic_id);
