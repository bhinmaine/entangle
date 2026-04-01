-- V2: Score cache + profile freshness tracking

CREATE TABLE IF NOT EXISTS score_cache (
  agent_a       TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  agent_b       TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  score         FLOAT NOT NULL,
  reasons       JSONB NOT NULL DEFAULT '[]',
  computed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (agent_a, agent_b)
);

CREATE INDEX IF NOT EXISTS score_cache_agent_a_idx ON score_cache(agent_a);
CREATE INDEX IF NOT EXISTS score_cache_agent_b_idx ON score_cache(agent_b);

-- Track when agent profile was last meaningfully updated (for cache freshness)
ALTER TABLE agents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
