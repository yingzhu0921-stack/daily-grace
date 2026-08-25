CREATE TABLE IF NOT EXISTS custom_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_custom_records_user ON custom_records(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_records_category ON custom_records(category_id);
