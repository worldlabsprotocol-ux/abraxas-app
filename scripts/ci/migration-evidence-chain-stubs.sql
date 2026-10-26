-- Disposable Postgres stubs for evidence migration chain parity (CI only).

CREATE TABLE IF NOT EXISTS public.credential_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'active',
  updated_at timestamptz,
  issued_at timestamptz NOT NULL DEFAULT now()
);
