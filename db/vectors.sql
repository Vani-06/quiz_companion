-- Adaptive Learning Platform: vector similarity recommendations (pgvector)
-- Each learning item gets a 384-dimension embedding of its text (title, topic,
-- questions, technologies). A student's profile vector is the average of the
-- items they attempted, weighted towards the ones they found hard. Items closest
-- to that profile are recommended. Requires the pgvector extension.
-- Safe to re-run. Embeddings are filled by `npm run db:embed`.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS item_embedding (
  item_id     INT PRIMARY KEY
    REFERENCES learning_item(item_id) ON DELETE CASCADE,
  embedding   vector(384) NOT NULL,
  model       VARCHAR(100) NOT NULL,
  source_text TEXT NOT NULL,
  updated_at  TIMESTAMP NOT NULL DEFAULT LOCALTIMESTAMP
);

-- Approximate nearest-neighbour search by cosine distance.
CREATE INDEX IF NOT EXISTS idx_item_embedding_hnsw
  ON item_embedding USING hnsw (embedding vector_cosine_ops);

-- Student profile vector -----------------------------------------------------
-- Weighted mean of the embeddings of every item the student has a score for.
-- Weight = 101 - best score, so a 45% item counts eleven times more than a 95% one.
-- NULL when the student has no scored attempts on embedded items.

CREATE OR REPLACE FUNCTION student_profile(p_user INT)
RETURNS vector AS $$
  WITH best AS (
    SELECT item_id, MAX(score) AS best_score
    FROM learning_record
    WHERE user_id = p_user AND score IS NOT NULL
    GROUP BY item_id
  ),
  weighted AS (
    SELECT u.ord,
           SUM(u.val * (101 - b.best_score)) / SUM(101 - b.best_score) AS val
    FROM best b
    JOIN item_embedding e ON e.item_id = b.item_id
    CROSS JOIN LATERAL unnest(e.embedding::real[]) WITH ORDINALITY AS u(val, ord)
    GROUP BY u.ord
  )
  SELECT (array_agg(val ORDER BY ord))::real[]::vector
  FROM weighted;
$$ LANGUAGE sql STABLE;

-- Similar-item recommendations -----------------------------------------------
-- Recommends up to p_limit items the student has never attempted, closest to
-- their profile and at least p_min_similarity alike (cosine; below about 0.35
-- MiniLM pairs are unrelated subjects). rank_score is the cosine similarity.
-- The reason names the nearest item in their history and whether they found it
-- hard (below 70) or passed it. Returns rows added.

DROP FUNCTION IF EXISTS generate_similar_recommendations(INT, INT);
CREATE OR REPLACE FUNCTION generate_similar_recommendations(
  p_user INT, p_limit INT DEFAULT 3, p_min_similarity NUMERIC DEFAULT 0.35)
RETURNS INTEGER AS $$
DECLARE
  v_profile vector;
  v_added   INTEGER;
BEGIN
  v_profile := student_profile(p_user);
  IF v_profile IS NULL THEN
    RETURN 0;
  END IF;

  INSERT INTO recommendation
    (user_id, item_id, rank_score, reason, status, created_at)
  SELECT p_user, e.item_id,
         ROUND(GREATEST(0, 1 - (e.embedding <=> v_profile))::numeric, 4),
         LEFT(CASE
                WHEN near.title IS NULL THEN 'Matches your learning history'
                WHEN near.best_score < 70 THEN 'Similar to ' || near.title || ', which you found hard'
                ELSE 'Builds on ' || near.title || ', which you passed'
              END, 200),
         'active', LOCALTIMESTAMP
  FROM item_embedding e
  LEFT JOIN LATERAL (
    -- The scored item in the student's history closest to this candidate.
    SELECT li.title, history.best_score
    FROM (SELECT item_id, MAX(score) AS best_score
          FROM learning_record
          WHERE user_id = p_user AND score IS NOT NULL
          GROUP BY item_id) history
    JOIN item_embedding e2 ON e2.item_id = history.item_id
    JOIN learning_item li ON li.item_id = history.item_id
    ORDER BY e2.embedding <=> e.embedding
    LIMIT 1
  ) near ON TRUE
  WHERE 1 - (e.embedding <=> v_profile) >= p_min_similarity
    AND NOT EXISTS (SELECT 1 FROM learning_record lr
                    WHERE lr.user_id = p_user AND lr.item_id = e.item_id)
    AND NOT EXISTS (SELECT 1 FROM recommendation r
                    WHERE r.user_id = p_user AND r.item_id = e.item_id)
  ORDER BY e.embedding <=> v_profile
  LIMIT p_limit;

  GET DIAGNOSTICS v_added = ROW_COUNT;
  RETURN v_added;
END;
$$ LANGUAGE plpgsql;
