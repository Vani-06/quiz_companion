-- Adaptive Learning Platform: Phase 2 DDL (PostgreSQL)
-- 10 tables, 12 foreign keys, consistent with the Phase 1 relational schema (3NF).
-- Re-running this script drops and recreates every table.

DROP TABLE IF EXISTS recommendation      CASCADE;
DROP TABLE IF EXISTS topic_proficiency   CASCADE;
DROP TABLE IF EXISTS learning_record     CASCADE;
DROP TABLE IF EXISTS question            CASCADE;
DROP TABLE IF EXISTS project_tech        CASCADE;
DROP TABLE IF EXISTS project             CASCADE;
DROP TABLE IF EXISTS quiz                CASCADE;
DROP TABLE IF EXISTS learning_item       CASCADE;
DROP TABLE IF EXISTS topic               CASCADE;
DROP TABLE IF EXISTS users               CASCADE;

-- Strong entities ------------------------------------------------------------

CREATE TABLE users (
  user_id       SERIAL PRIMARY KEY,
  full_name     VARCHAR(100),
  email         VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  skill_level   VARCHAR(15),
  created_at    TIMESTAMP
);

CREATE TABLE topic (
  topic_id        SERIAL PRIMARY KEY,
  name            VARCHAR(80) UNIQUE NOT NULL,
  description     TEXT,
  parent_topic_id INT,
  FOREIGN KEY (parent_topic_id)
    REFERENCES topic(topic_id)
);

CREATE TABLE learning_item (
  item_id    SERIAL PRIMARY KEY,
  topic_id   INT REFERENCES topic(topic_id),
  title      VARCHAR(150) NOT NULL,
  difficulty SMALLINT
    CHECK (difficulty BETWEEN 1 AND 5),
  item_type  VARCHAR(7)
    CHECK (item_type IN ('QUIZ', 'PROJECT')),
  created_at TIMESTAMP
);

-- Subclasses of learning_item ------------------------------------------------

CREATE TABLE quiz (
  item_id        INT PRIMARY KEY
    REFERENCES learning_item(item_id),
  time_limit_min SMALLINT,
  pass_mark      SMALLINT
);

CREATE TABLE project (
  item_id   INT PRIMARY KEY
    REFERENCES learning_item(item_id),
  est_hours NUMERIC(4,1),
  repo_url  VARCHAR(255)
);

-- Multivalued attribute and weak entity --------------------------------------

CREATE TABLE project_tech (
  item_id INT NOT NULL,
  tech    VARCHAR(50) NOT NULL,
  PRIMARY KEY (item_id, tech),
  FOREIGN KEY (item_id)
    REFERENCES project(item_id)
);

CREATE TABLE question (
  quiz_id        INT NOT NULL,
  question_no    SMALLINT NOT NULL,
  question_text  TEXT,
  correct_answer TEXT,
  marks          SMALLINT,
  PRIMARY KEY (quiz_id, question_no),
  FOREIGN KEY (quiz_id)
    REFERENCES quiz(item_id)
);

-- Many-to-many relationships -------------------------------------------------

CREATE TABLE learning_record (
  user_id      INT NOT NULL,
  item_id      INT NOT NULL,
  attempt_no   SMALLINT NOT NULL,
  status       VARCHAR(12),
  score        NUMERIC(5,2),
  started_at   TIMESTAMP,
  completed_at TIMESTAMP,
  PRIMARY KEY (user_id, item_id, attempt_no),
  FOREIGN KEY (user_id)
    REFERENCES users(user_id),
  FOREIGN KEY (item_id)
    REFERENCES learning_item(item_id)
);

CREATE TABLE topic_proficiency (
  user_id           INT NOT NULL,
  topic_id          INT NOT NULL,
  proficiency_score NUMERIC(5,2),
  attempts_count    INT,
  last_updated      TIMESTAMP,
  PRIMARY KEY (user_id, topic_id),
  FOREIGN KEY (user_id)
    REFERENCES users(user_id),
  FOREIGN KEY (topic_id)
    REFERENCES topic(topic_id)
);

CREATE TABLE recommendation (
  user_id    INT NOT NULL,
  item_id    INT NOT NULL,
  rank_score NUMERIC(5,4),
  reason     VARCHAR(200),
  status     VARCHAR(10),
  created_at TIMESTAMP,
  PRIMARY KEY (user_id, item_id),
  FOREIGN KEY (user_id)
    REFERENCES users(user_id),
  FOREIGN KEY (item_id)
    REFERENCES learning_item(item_id)
);
