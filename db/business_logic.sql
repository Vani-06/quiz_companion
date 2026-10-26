-- Adaptive Learning Platform: business logic (PostgreSQL)
-- Validation constraints, functions, triggers and views behind the front end.
-- Run after schema.sql and seed.sql. Safe to re-run.

-- Validation rules -----------------------------------------------------------

ALTER TABLE learning_record
  DROP CONSTRAINT IF EXISTS chk_score,
  DROP CONSTRAINT IF EXISTS chk_status,
  DROP CONSTRAINT IF EXISTS chk_dates;
ALTER TABLE learning_record
  ADD CONSTRAINT chk_score
    CHECK (score BETWEEN 0 AND 100),
  ADD CONSTRAINT chk_status
    CHECK (status IN ('in_progress', 'submitted', 'completed')),
  ADD CONSTRAINT chk_dates
    CHECK (completed_at IS NULL OR completed_at >= started_at);

ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_skill;
ALTER TABLE users
  ADD CONSTRAINT chk_skill
    CHECK (skill_level IN ('Beginner', 'Intermediate', 'Advanced'));

ALTER TABLE recommendation DROP CONSTRAINT IF EXISTS chk_rec_status;
ALTER TABLE recommendation
  ADD CONSTRAINT chk_rec_status
    CHECK (status IN ('active', 'completed', 'dismissed'));

-- Recording an attempt -------------------------------------------------------
-- The next attempt number is calculated, never supplied by the caller.
-- Returns the attempt number that was stored.

DROP FUNCTION IF EXISTS record_attempt(INT, INT, VARCHAR, NUMERIC, TIMESTAMP);
CREATE OR REPLACE FUNCTION record_attempt(
  p_user    INT,
  p_item    INT,
  p_status  VARCHAR,
  p_score   NUMERIC,
  p_started TIMESTAMPTZ DEFAULT NOW())
RETURNS SMALLINT AS $$
DECLARE
  v_no SMALLINT;
BEGIN
  -- Serialise attempts for the same user and item so numbers never collide.
  PERFORM pg_advisory_xact_lock(p_user, p_item);

  SELECT COALESCE(MAX(attempt_no), 0) + 1 INTO v_no
  FROM learning_record
  WHERE user_id = p_user AND item_id = p_item;

  INSERT INTO learning_record
    (user_id, item_id, attempt_no, status,
     score, started_at, completed_at)
  VALUES
    (p_user, p_item, v_no, p_status,
     p_score, p_started::TIMESTAMP,
     CASE WHEN p_status = 'in_progress' THEN NULL ELSE LOCALTIMESTAMP END);

  RETURN v_no;
END;
$$ LANGUAGE plpgsql;

-- Grading a quiz attempt -----------------------------------------------------
-- p_answers maps question numbers to answers, e.g. {"1": "0", "2": "Traversal"}.
-- Score = marks earned / total marks * 100. NULL when the quiz has no questions.

CREATE OR REPLACE FUNCTION grade_quiz(p_quiz INT, p_answers JSONB)
RETURNS NUMERIC AS $$
  SELECT ROUND(100.0 * COALESCE(
      SUM(q.marks) FILTER (
        WHERE LOWER(TRIM(p_answers ->> q.question_no::TEXT))
            = LOWER(TRIM(q.correct_answer))), 0)
    / NULLIF(SUM(q.marks), 0), 2)
  FROM question q
  WHERE q.quiz_id = p_quiz;
$$ LANGUAGE sql STABLE;

-- Updating topic proficiency automatically -----------------------------------
-- Proficiency is the latest scored attempt for the topic; attempts_count grows by 1.

CREATE OR REPLACE FUNCTION fn_update_proficiency()
RETURNS TRIGGER AS $$
DECLARE
  v_topic INT;
BEGIN
  SELECT topic_id INTO v_topic
  FROM learning_item WHERE item_id = NEW.item_id;

  IF v_topic IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO topic_proficiency
    (user_id, topic_id, proficiency_score, attempts_count, last_updated)
  VALUES (NEW.user_id, v_topic, NEW.score, 1, LOCALTIMESTAMP)
  ON CONFLICT (user_id, topic_id) DO UPDATE SET
    proficiency_score = EXCLUDED.proficiency_score,
    attempts_count    = topic_proficiency.attempts_count + 1,
    last_updated      = LOCALTIMESTAMP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_proficiency ON learning_record;
CREATE TRIGGER trg_update_proficiency
AFTER INSERT ON learning_record
FOR EACH ROW
WHEN (NEW.score IS NOT NULL)
EXECUTE FUNCTION fn_update_proficiency();

-- Strong and weak topics -----------------------------------------------------

CREATE OR REPLACE VIEW v_topic_strength AS
SELECT tp.user_id, t.topic_id, t.name AS topic,
  tp.proficiency_score,
  CASE
    WHEN tp.proficiency_score >= 80 THEN 'Strong'
    WHEN tp.proficiency_score >= 70 THEN 'Average'
    ELSE 'Weak'
  END AS strength
FROM topic_proficiency tp
JOIN topic t ON t.topic_id = tp.topic_id;

-- Recommendations for weak topics --------------------------------------------
-- A topic is weak below 70. Lower proficiency gives a higher rank score.
-- Items already recommended to the student are skipped. Returns rows added.

DROP FUNCTION IF EXISTS generate_recommendations(INT);
CREATE OR REPLACE FUNCTION generate_recommendations(p_user INT)
RETURNS INTEGER AS $$
DECLARE
  v_added INTEGER;
BEGIN
  INSERT INTO recommendation
    (user_id, item_id, rank_score, reason, status, created_at)
  SELECT tp.user_id, li.item_id,
         ROUND((100 - tp.proficiency_score) / 100, 4),
         'Low proficiency in ' || t.name,
         'active', LOCALTIMESTAMP
  FROM topic_proficiency tp
  JOIN topic t ON t.topic_id = tp.topic_id
  JOIN learning_item li ON li.topic_id = tp.topic_id
  WHERE tp.user_id = p_user
    AND tp.proficiency_score < 70
  ON CONFLICT (user_id, item_id) DO NOTHING;

  GET DIAGNOSTICS v_added = ROW_COUNT;
  RETURN v_added;
END;
$$ LANGUAGE plpgsql;

-- Leaderboard ----------------------------------------------------------------
-- Only each student's best score per item counts.

CREATE OR REPLACE VIEW v_leaderboard AS
SELECT u.user_id, u.full_name,
  SUM(b.best_score) AS total_score,
  RANK() OVER (ORDER BY SUM(b.best_score) DESC) AS rank
FROM users u
JOIN (SELECT user_id, item_id, MAX(score) AS best_score
      FROM learning_record
      WHERE status IN ('completed', 'submitted')
      GROUP BY user_id, item_id) b
  ON b.user_id = u.user_id
GROUP BY u.user_id, u.full_name;

-- Account rules --------------------------------------------------------------
-- The application hashes the password before calling this function.
-- A duplicate email is rejected by the UNIQUE constraint on users.email.

CREATE OR REPLACE FUNCTION register_user(
  p_name VARCHAR, p_email VARCHAR, p_hash VARCHAR)
RETURNS INT AS $$
  INSERT INTO users (full_name, email, password_hash, skill_level, created_at)
  VALUES (TRIM(p_name), LOWER(TRIM(p_email)), p_hash, 'Beginner', LOCALTIMESTAMP)
  RETURNING user_id;
$$ LANGUAGE sql;

-- Administrator rules --------------------------------------------------------
-- A topic that still has learning items cannot be deleted.

CREATE OR REPLACE FUNCTION fn_block_topic_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM learning_item
             WHERE topic_id = OLD.topic_id) THEN
    RAISE EXCEPTION 'Topic % still has learning items', OLD.topic_id
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_block_topic_delete ON topic;
CREATE TRIGGER trg_block_topic_delete
BEFORE DELETE ON topic
FOR EACH ROW
EXECUTE FUNCTION fn_block_topic_delete();
