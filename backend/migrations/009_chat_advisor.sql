-- =============================================================
-- Migration 009: ChatMessages table for the AI Chat Advisor widget.
-- Idempotent — safe to re-run.
-- =============================================================

CREATE TABLE IF NOT EXISTS "ChatMessages" (
  "Id"              BIGSERIAL PRIMARY KEY,
  "UserID"          INTEGER NOT NULL REFERENCES "Users"("UserID") ON DELETE CASCADE,
  "Role"            TEXT NOT NULL CHECK ("Role" IN ('user', 'assistant')),
  "Content"         TEXT NOT NULL,
  "ContextAttached" JSONB NULL,
  "CreatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chatmessages_user_created
  ON "ChatMessages" ("UserID", "CreatedAt" DESC);

NOTIFY pgrst, 'reload schema';

-- Rollback:
--   DROP TABLE IF EXISTS "ChatMessages";
