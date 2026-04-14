-- ============================================================
-- OPLEXA AI ASSISTANT — DATABASE SCHEMA
-- ============================================================
-- Run this file to create all tables from scratch.
-- Compatible with PostgreSQL 13+
-- ============================================================

-- Drop existing tables (safe order)
DROP TABLE IF EXISTS oplexa_messages CASCADE;
DROP TABLE IF EXISTS oplexa_conversations CASCADE;
DROP TABLE IF EXISTS oplexa_ai_config CASCADE;
DROP TABLE IF EXISTS oplexa_users CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;

-- ============================================================
-- OPLEXA USERS
-- ============================================================
CREATE TABLE oplexa_users (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  email        VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  phone        VARCHAR(20),
  bio          TEXT,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_admin     BOOLEAN     NOT NULL DEFAULT false
);

-- ============================================================
-- OPLEXA CONVERSATIONS
-- ============================================================
CREATE TABLE oplexa_conversations (
  id         TEXT        PRIMARY KEY,
  user_id    INTEGER     NOT NULL REFERENCES oplexa_users(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL,
  pinned     BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oplexa_conversations_user_id ON oplexa_conversations(user_id);
CREATE INDEX idx_oplexa_conversations_updated_at ON oplexa_conversations(updated_at DESC);

-- ============================================================
-- OPLEXA MESSAGES
-- ============================================================
CREATE TABLE oplexa_messages (
  id              SERIAL      PRIMARY KEY,
  conversation_id TEXT        NOT NULL REFERENCES oplexa_conversations(id) ON DELETE CASCADE,
  role            TEXT        NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         TEXT        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oplexa_messages_conversation_id ON oplexa_messages(conversation_id);

-- ============================================================
-- OPLEXA AI CONFIG (Admin Panel — AI Training)
-- ============================================================
CREATE TABLE oplexa_ai_config (
  id            SERIAL      PRIMARY KEY,
  system_prompt TEXT        NOT NULL DEFAULT '',
  personality   TEXT        NOT NULL DEFAULT '',
  restrictions  TEXT        NOT NULL DEFAULT '',
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default config row (only one row used)
INSERT INTO oplexa_ai_config (system_prompt, personality, restrictions)
VALUES ('', '', '');

-- ============================================================
-- LEGACY TABLES (kept for backward compatibility)
-- ============================================================
CREATE TABLE conversations (
  id         SERIAL      PRIMARY KEY,
  title      TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE messages (
  id              SERIAL  PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT    NOT NULL,
  content         TEXT    NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DONE
-- ============================================================
