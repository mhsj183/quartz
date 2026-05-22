CREATE TABLE IF NOT EXISTS article_uv (
  path TEXT NOT NULL,
  visitor_hash TEXT NOT NULL,
  first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (path, visitor_hash)
);

CREATE INDEX IF NOT EXISTS article_uv_path_idx ON article_uv(path);
