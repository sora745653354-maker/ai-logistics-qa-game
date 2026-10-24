CREATE TABLE IF NOT EXISTS assistant_usage (
  user_key TEXT NOT NULL,
  usage_day TEXT NOT NULL,
  requests INTEGER NOT NULL CHECK (requests BETWEEN 1 AND 20),
  PRIMARY KEY (user_key, usage_day)
);
