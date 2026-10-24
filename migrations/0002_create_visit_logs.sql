CREATE TABLE IF NOT EXISTS visit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  open_id TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT NOT NULL DEFAULT '',
  visited_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS visit_logs_visited_at
  ON visit_logs(visited_at DESC);
