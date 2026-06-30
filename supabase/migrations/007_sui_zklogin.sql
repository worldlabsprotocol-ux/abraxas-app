-- FILE: supabase/migrations/007_sui_zklogin.sql
-- Sui-native verification identity (zkLogin) + holder address columns.

-- zkLogin identity registry (OAuth sub → deterministic Sui address)
CREATE TABLE IF NOT EXISTS sui_zklogin_identities (
  oauth_sub     TEXT PRIMARY KEY,
  provider      TEXT NOT NULL DEFAULT 'google',
  sui_address   TEXT NOT NULL UNIQUE,
  user_salt     TEXT NOT NULL,
  email         TEXT,
  max_epoch     BIGINT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sui_zklogin_email ON sui_zklogin_identities (email);
CREATE INDEX IF NOT EXISTS idx_sui_zklogin_address ON sui_zklogin_identities (sui_address);

-- Extend identity tables for Sui holder (wallet_address kept for migration compat)
ALTER TABLE identity_verifications
  ADD COLUMN IF NOT EXISTS sui_address TEXT;

CREATE INDEX IF NOT EXISTS idx_identity_verifications_sui
  ON identity_verifications (sui_address);

ALTER TABLE abraxas_credentials
  ADD COLUMN IF NOT EXISTS sui_address TEXT;

CREATE INDEX IF NOT EXISTS idx_abraxas_credentials_sui
  ON abraxas_credentials (sui_address);

-- Optional: link email-keyed passport flow to Sui address
ALTER TABLE identity_verifications
  ADD COLUMN IF NOT EXISTS user_email TEXT;

CREATE INDEX IF NOT EXISTS idx_identity_verifications_email
  ON identity_verifications (user_email);

COMMENT ON TABLE sui_zklogin_identities IS
  'Maps OAuth subject to zkLogin-derived Sui address. user_salt must stay server-side.';
