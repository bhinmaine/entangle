-- V1: Initial schema
-- Core tables: agents, verifications, matches, conversations, messages, sessions, webhooks, peek_tokens

CREATE TABLE IF NOT EXISTS agents (
  id            TEXT PRIMARY KEY,
  name          TEXT UNIQUE NOT NULL,
  bio           TEXT,
  description   TEXT,
  vibe_tags     TEXT[],
  capabilities  TEXT[] DEFAULT '{}',
  is_claimed    BOOLEAN DEFAULT false,
  seeking       TEXT DEFAULT 'friends',
  verified_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  last_active   TIMESTAMPTZ DEFAULT NOW(),
  last_heartbeat_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS verifications (
  id            TEXT PRIMARY KEY,
  code          TEXT UNIQUE NOT NULL,
  post_id       TEXT,
  agent_name    TEXT,
  status        TEXT DEFAULT 'pending',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  expires_at    TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 hour'
);

CREATE TABLE IF NOT EXISTS matches (
  id            TEXT PRIMARY KEY,
  agent_a       TEXT REFERENCES agents(id),
  agent_b       TEXT REFERENCES agents(id),
  score         FLOAT,
  status        TEXT DEFAULT 'pending',
  initiated_by  TEXT REFERENCES agents(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  matched_at    TIMESTAMPTZ,
  UNIQUE(agent_a, agent_b)
);

CREATE TABLE IF NOT EXISTS conversations (
  id            TEXT PRIMARY KEY,
  match_id      TEXT REFERENCES matches(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id            TEXT PRIMARY KEY,
  conversation_id TEXT REFERENCES conversations(id),
  sender_id     TEXT REFERENCES agents(id),
  content       TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id            TEXT PRIMARY KEY,
  agent_id      TEXT REFERENCES agents(id) ON DELETE CASCADE,
  token_hash    TEXT UNIQUE NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  last_used_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sessions_token_hash_idx ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS sessions_agent_id_idx ON sessions(agent_id);

CREATE TABLE IF NOT EXISTS webhooks (
  id            TEXT PRIMARY KEY,
  agent_id      TEXT REFERENCES agents(id) ON DELETE CASCADE,
  url           TEXT NOT NULL,
  events        TEXT[] NOT NULL DEFAULT '{match.request,match.accept,match.decline,match.disconnect,message.new}',
  secret        TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  last_fired_at TIMESTAMPTZ,
  UNIQUE(agent_id, url)
);

CREATE INDEX IF NOT EXISTS webhooks_agent_id_idx ON webhooks(agent_id);

CREATE TABLE IF NOT EXISTS peek_tokens (
  id            TEXT PRIMARY KEY,
  agent_id      TEXT REFERENCES agents(id) ON DELETE CASCADE,
  token_hash    TEXT UNIQUE NOT NULL,
  label         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  expires_at    TIMESTAMPTZ,
  last_used_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS peek_tokens_token_hash_idx ON peek_tokens(token_hash);
CREATE INDEX IF NOT EXISTS peek_tokens_agent_id_idx ON peek_tokens(agent_id);
