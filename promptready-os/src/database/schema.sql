-- =============================================================================
-- PromptReady OS · Local SQLite schema
-- -----------------------------------------------------------------------------
-- Local-first. Every table lives on the user's machine; cloud sync (Phase 4+)
-- treats this as the canonical source and pushes diffs upward.
--
-- Conventions:
--   - id: TEXT (uuid v4, generated client-side)
--   - timestamps: INTEGER (epoch ms)
--   - JSON columns: TEXT (validated at the service boundary, never via SQL)
--   - FTS via SQLite FTS5 for prompt + workflow search
--   - migrations live in src/database/migrations/{NNNN}_<name>.sql
-- =============================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA synchronous = NORMAL;

-- ============================================================================
-- 1. PROMPT VAULT
-- ============================================================================

CREATE TABLE IF NOT EXISTS folders (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  parent_id   TEXT REFERENCES folders(id) ON DELETE CASCADE,
  color       TEXT,                          -- hex; nullable
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  color       TEXT,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS prompts (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,                 -- the optimised, execution-ready prompt
  raw_input   TEXT,                          -- the user's original messy paste
  mode        TEXT,                          -- general | coding | terminal | json | business | …
  folder_id   TEXT REFERENCES folders(id) ON DELETE SET NULL,
  pinned      INTEGER NOT NULL DEFAULT 0,    -- 0 / 1
  favorite    INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  origin      TEXT NOT NULL DEFAULT 'manual' -- manual | fixer | imported | shared
);

CREATE TABLE IF NOT EXISTS prompt_tags (
  prompt_id   TEXT NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  tag_id      TEXT NOT NULL REFERENCES tags(id)    ON DELETE CASCADE,
  PRIMARY KEY (prompt_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_prompts_folder      ON prompts(folder_id);
CREATE INDEX IF NOT EXISTS idx_prompts_updated     ON prompts(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompts_pinned      ON prompts(pinned) WHERE pinned = 1;
CREATE INDEX IF NOT EXISTS idx_prompts_favorite    ON prompts(favorite) WHERE favorite = 1;

-- ============================================================================
-- 2. SESSIONS · CONTINUITY
-- ============================================================================
-- A "session" is one round trip: raw input → optimised prompt → (optional)
-- launch to a model → outcome. Sessions never get deleted automatically;
-- the user owns their history.

CREATE TABLE IF NOT EXISTS sessions (
  id              TEXT PRIMARY KEY,
  prompt_id       TEXT REFERENCES prompts(id) ON DELETE SET NULL,
  raw_input       TEXT NOT NULL,
  optimized       TEXT,                      -- the rendered execution-ready prompt
  output          TEXT,                      -- pasted-back / fetched output
  model           TEXT,
  provider        TEXT,                      -- claude | chatgpt | gemini | perplexity | ollama | …
  status          TEXT NOT NULL,             -- draft | sent | completed | failed | recovered
  reason          TEXT,                      -- failure reason / recovery note
  duration_ms     INTEGER,
  tokens_in       INTEGER,
  tokens_out      INTEGER,
  metadata        TEXT,                      -- JSON: score, safety, supervisor notes, …
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_created    ON sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_status     ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_provider   ON sessions(provider);

-- Drafts: autosave for in-flight composition. Cleared when the draft becomes
-- a completed session, retained for crash recovery otherwise.
CREATE TABLE IF NOT EXISTS drafts (
  id          TEXT PRIMARY KEY,
  body        TEXT NOT NULL,
  context     TEXT,                          -- JSON: mode, quality, target model, …
  scope       TEXT NOT NULL DEFAULT 'global',-- global | session:<id> | overlay
  updated_at  INTEGER NOT NULL
);

-- Snapshots: per-session timeline (input → optimised → action → output).
-- Used by the Continuity timeline view and "restore this state".
CREATE TABLE IF NOT EXISTS snapshots (
  id          TEXT PRIMARY KEY,
  session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,                 -- input | optimised | sent | output | error
  data        TEXT NOT NULL,                 -- text or JSON
  created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_snapshots_session   ON snapshots(session_id, created_at);

-- ============================================================================
-- 3. WORKFLOWS · CHAINS
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflows (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  steps       TEXT NOT NULL,                 -- JSON array of { prompt_id, model, role }
  pinned      INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

-- ============================================================================
-- 4. ANALYTICS
-- ============================================================================
-- Append-only event log. Aggregated lazily by the Workflow Dashboard.

CREATE TABLE IF NOT EXISTS usage_events (
  id           TEXT PRIMARY KEY,
  ts           INTEGER NOT NULL,
  kind         TEXT NOT NULL,                -- prompt-optimised | launched | session-resumed | …
  module       TEXT NOT NULL,                -- fixer | launcher | continuity | vault | …
  provider     TEXT,
  model        TEXT,
  duration_ms  INTEGER,
  metadata     TEXT
);

CREATE INDEX IF NOT EXISTS idx_usage_ts            ON usage_events(ts);
CREATE INDEX IF NOT EXISTS idx_usage_module        ON usage_events(module);

-- ============================================================================
-- 5. SETTINGS
-- ============================================================================
-- Single key-value store. Larger / nested config goes in JSON values.

CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,                  -- JSON-encoded
  updated_at INTEGER NOT NULL
);

-- ============================================================================
-- 6. SECRETS  (delegated to the OS keychain via Tauri — never plaintext SQL)
-- ============================================================================
-- This table holds *references* only. The actual secret value lives in the
-- macOS Keychain / Windows Credential Manager / libsecret via tauri-plugin-stronghold.
CREATE TABLE IF NOT EXISTS secret_refs (
  id          TEXT PRIMARY KEY,              -- e.g. anthropic-api-key
  label       TEXT NOT NULL,
  keychain_id TEXT NOT NULL,                 -- handle to the platform keystore entry
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

-- ============================================================================
-- 7. FULL-TEXT SEARCH
-- ============================================================================
-- One FTS5 virtual table per searchable surface. Trigger-synced.

CREATE VIRTUAL TABLE IF NOT EXISTS prompts_fts USING fts5(
  title,
  body,
  raw_input,
  content='prompts',
  content_rowid='rowid',
  tokenize='unicode61 remove_diacritics 2'
);

CREATE TRIGGER IF NOT EXISTS prompts_ai AFTER INSERT ON prompts BEGIN
  INSERT INTO prompts_fts(rowid, title, body, raw_input)
  VALUES (new.rowid, new.title, new.body, COALESCE(new.raw_input, ''));
END;

CREATE TRIGGER IF NOT EXISTS prompts_ad AFTER DELETE ON prompts BEGIN
  INSERT INTO prompts_fts(prompts_fts, rowid, title, body, raw_input)
  VALUES('delete', old.rowid, old.title, old.body, COALESCE(old.raw_input, ''));
END;

CREATE TRIGGER IF NOT EXISTS prompts_au AFTER UPDATE ON prompts BEGIN
  INSERT INTO prompts_fts(prompts_fts, rowid, title, body, raw_input)
  VALUES('delete', old.rowid, old.title, old.body, COALESCE(old.raw_input, ''));
  INSERT INTO prompts_fts(rowid, title, body, raw_input)
  VALUES (new.rowid, new.title, new.body, COALESCE(new.raw_input, ''));
END;

CREATE VIRTUAL TABLE IF NOT EXISTS workflows_fts USING fts5(
  name,
  description,
  content='workflows',
  content_rowid='rowid'
);
