-- Apply in Neon after creating the project. This mirrors the SeraPay persistence schema.
CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE mini_app_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  open_id VARCHAR(64) NOT NULL UNIQUE,
  name TEXT,
  email VARCHAR(320),
  login_method VARCHAR(64),
  role user_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_signed_in TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mini_apps (
  id SERIAL PRIMARY KEY,
  submitted_by_user_id INTEGER NOT NULL,
  name VARCHAR(80) NOT NULL,
  description TEXT NOT NULL,
  logo_url VARCHAR(2048) NOT NULL,
  launch_url VARCHAR(2048) NOT NULL,
  manifest_url VARCHAR(2048) NOT NULL,
  developer_identity VARCHAR(120) NOT NULL,
  category VARCHAR(32) NOT NULL,
  version VARCHAR(48) NOT NULL,
  permissions JSONB NOT NULL,
  supported_currencies JSONB NOT NULL,
  status mini_app_status NOT NULL DEFAULT 'pending',
  review_note TEXT,
  reviewed_by_user_id INTEGER,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mini_apps_status_reviewed_at_idx ON mini_apps (status, reviewed_at DESC);

CREATE TABLE IF NOT EXISTS sera_api_credentials (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  owner_address VARCHAR(42) NOT NULL,
  api_key VARCHAR(128) NOT NULL UNIQUE,
  encrypted_api_secret TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_verified_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  UNIQUE (user_id, owner_address)
);
