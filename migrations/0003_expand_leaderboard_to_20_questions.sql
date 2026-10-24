CREATE TABLE leaderboard_new (
  open_id TEXT NOT NULL,
  name TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('easy', 'normal', 'hard')),
  topic TEXT NOT NULL CHECK (topic IN ('all', 'ai', 'b2b', 'b2c')),
  score INTEGER NOT NULL CHECK (score >= 0),
  duration INTEGER NOT NULL CHECK (duration BETWEEN 1 AND 86400),
  correct INTEGER NOT NULL CHECK (correct BETWEEN 0 AND 20),
  total INTEGER NOT NULL CHECK (total IN (6, 20) AND correct <= total),
  achieved_at INTEGER NOT NULL,
  PRIMARY KEY (open_id, level, topic)
);

INSERT INTO leaderboard_new (
  open_id, name, level, topic, score, duration, correct, total, achieved_at
)
SELECT
  open_id, name, level, topic, score, duration, correct, total, achieved_at
FROM leaderboard;

DROP TABLE leaderboard;
ALTER TABLE leaderboard_new RENAME TO leaderboard;

CREATE INDEX leaderboard_rank
  ON leaderboard(level, topic, score DESC, duration ASC, achieved_at ASC);
