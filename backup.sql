-- ============================================================
-- OPLEXA AI ASSISTANT — FULL DATABASE BACKUP
-- ============================================================
-- Generated: 2026-04-14
-- Includes: Schema + All Data
-- ============================================================

-- Run schema first, then this file for data restore
-- Or run this file directly (it includes DROP + CREATE)

-- ============================================================
-- RECREATE SCHEMA
-- ============================================================

DROP TABLE IF EXISTS oplexa_messages CASCADE;
DROP TABLE IF EXISTS oplexa_conversations CASCADE;
DROP TABLE IF EXISTS oplexa_ai_config CASCADE;
DROP TABLE IF EXISTS oplexa_users CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;

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

CREATE TABLE oplexa_messages (
  id              SERIAL      PRIMARY KEY,
  conversation_id TEXT        NOT NULL REFERENCES oplexa_conversations(id) ON DELETE CASCADE,
  role            TEXT        NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         TEXT        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oplexa_messages_conversation_id ON oplexa_messages(conversation_id);

CREATE TABLE oplexa_ai_config (
  id            SERIAL      PRIMARY KEY,
  system_prompt TEXT        NOT NULL DEFAULT '',
  personality   TEXT        NOT NULL DEFAULT '',
  restrictions  TEXT        NOT NULL DEFAULT '',
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
-- DATA: oplexa_users
-- ============================================================
-- NOTE: Passwords are bcrypt hashed — safe to store in backup
-- NOTE: avatar_url for user 4 was a temporary blob URL, set to NULL here

INSERT INTO oplexa_users (id, name, email, password_hash, phone, bio, avatar_url, created_at, updated_at, is_admin) VALUES
(1, 'Test User',     'test@oplexa.in',                  '$2b$12$nPQ0AoHahQQrzwtyykpLjuyB7AA/Z5EGLOprC3VdWZCQHQWY191ci', NULL, NULL, NULL, '2026-04-14 11:44:07.999452+00', '2026-04-14 11:44:07.999452+00', false),
(2, 'Priya Sharma',  'priya@oplexa.in',                 '$2b$12$aXTWFNpF4HbXVdsbHAoSs.PnerORYypeWpQmpPUCMHUa3CjPW6ox2', NULL, NULL, NULL, '2026-04-14 11:58:25.264579+00', '2026-04-14 11:58:25.264579+00', false),
(3, 'Priya Sharma',  'priya2@oplexa.in',                '$2b$12$.m.KhgEFteU1MB5MQfNAguh2Cu1kxVt1.nTNr8xzB3rkrxXGXD2BW', NULL, NULL, NULL, '2026-04-14 11:58:33.340098+00', '2026-04-14 11:58:33.340098+00', false),
(4, 'kundan kumar',  'kundansinghofficial@gmail.com',   '$2b$12$z/olbul1fDQKUh3g8raDU.17kO.wCG7LH8ErWW/U2HWyl9mYr08PG', NULL, NULL, NULL, '2026-04-14 12:18:26.491172+00', '2026-04-14 12:50:54.425+00',   true);

-- Reset sequence after manual inserts
SELECT setval('oplexa_users_id_seq', (SELECT MAX(id) FROM oplexa_users));

-- ============================================================
-- DATA: oplexa_ai_config
-- ============================================================
INSERT INTO oplexa_ai_config (id, system_prompt, personality, restrictions, updated_at) VALUES
(1, '', '', '', NOW());

SELECT setval('oplexa_ai_config_id_seq', 1);

-- ============================================================
-- DATA: oplexa_conversations, oplexa_messages
-- ============================================================
-- No conversation/message data at backup time (stored locally in browser/app)

-- ============================================================
-- DONE — All data restored
-- ============================================================
