CREATE TABLE IF NOT EXISTS verse_cards (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  ratio TEXT NOT NULL DEFAULT '4:5',
  text TEXT NOT NULL DEFAULT '',
  ref TEXT DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  bg TEXT DEFAULT '',
  has_image INTEGER NOT NULL DEFAULT 0,
  has_bg_image INTEGER NOT NULL DEFAULT 0,
  editor_state TEXT DEFAULT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_verse_cards_user ON verse_cards(user_id);
