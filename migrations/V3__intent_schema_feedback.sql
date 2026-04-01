-- V3: History-aware cache TTL, intent_schema, feedback system, trust scores

-- Track how many times a pair has been scored (drives adaptive TTL)
ALTER TABLE score_cache ADD COLUMN IF NOT EXISTS interaction_count INT NOT NULL DEFAULT 0;

-- Intent schema: authority/task-type declarations for compatibility scoring
-- e.g. ["read-only", "can-commit-state", "human-approval-required", "fully-autonomous"]
ALTER TABLE agents ADD COLUMN IF NOT EXISTS intent_schema TEXT[] DEFAULT '{}';

-- Trust scores: aggregated from peer feedback, updated on each submission
ALTER TABLE agents ADD COLUMN IF NOT EXISTS trust_score FLOAT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS trust_rating_count INT NOT NULL DEFAULT 0;

-- Feedback on completed interactions
CREATE TABLE IF NOT EXISTS feedback (
  id            TEXT PRIMARY KEY,
  match_id      TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  from_agent    TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  about_agent   TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  rating        TEXT NOT NULL CHECK (rating IN ('helpful', 'neutral', 'misleading', 'manipulative', 'ghosted')),
  note          TEXT,                        -- optional 280-char note
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(match_id, from_agent)               -- one feedback per direction per match
);

CREATE INDEX IF NOT EXISTS feedback_about_agent_idx ON feedback(about_agent);
CREATE INDEX IF NOT EXISTS feedback_match_id_idx ON feedback(match_id);
CREATE INDEX IF NOT EXISTS feedback_from_agent_idx ON feedback(from_agent);
