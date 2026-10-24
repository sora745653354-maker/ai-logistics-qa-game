CREATE TABLE IF NOT EXISTS leaderboard (
  open_id TEXT NOT NULL,
  name TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('easy', 'normal', 'hard')),
  topic TEXT NOT NULL CHECK (topic IN ('all', 'ai', 'b2b', 'b2c')),
  score INTEGER NOT NULL CHECK (score >= 0),
  duration INTEGER NOT NULL CHECK (duration BETWEEN 1 AND 86400),
  correct INTEGER NOT NULL CHECK (correct BETWEEN 0 AND 6),
  total INTEGER NOT NULL CHECK (total = 6),
  achieved_at INTEGER NOT NULL,
  PRIMARY KEY (open_id, level, topic)
);

CREATE INDEX IF NOT EXISTS leaderboard_rank
  ON leaderboard(level, topic, score DESC, duration ASC, achieved_at ASC);
