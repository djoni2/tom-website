-- One row per vote. The UNIQUE constraint is what actually stops a reader
-- voting twice on the same poll -- enforced by SQLite, not by trusting the client.
CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  poll_id TEXT NOT NULL,
  option_key TEXT NOT NULL,
  voter_id TEXT NOT NULL,
  ip_hash TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (poll_id, voter_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_poll ON votes (poll_id);
