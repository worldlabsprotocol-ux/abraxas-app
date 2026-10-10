-- 138_decision_receipt_solana_commitments.sql
-- Solana devnet commitment provenance for eligible decision receipts (no PII on-chain).

CREATE TABLE IF NOT EXISTS public.decision_receipt_solana_commitments (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id              text        NOT NULL REFERENCES public.decision_receipts(id) ON DELETE RESTRICT,
  cluster                 text        NOT NULL DEFAULT 'devnet'
                            CHECK (cluster IN ('devnet')),
  network_id              text        NOT NULL DEFAULT 'solana_devnet',
  status                  text        NOT NULL
                            CHECK (status IN ('PENDING', 'SUBMITTED', 'CONFIRMED', 'FAILED', 'RETRYABLE', 'SUPERSEDED')),
  commitment_digest       text        NOT NULL CHECK (commitment_digest ~ '^[a-f0-9]{64}$'),
  payload_hash            text        NOT NULL CHECK (payload_hash ~ '^[a-f0-9]{64}$'),
  committer_pubkey        text        NOT NULL,
  memo_payload            text,
  transaction_signature   text,
  slot                    bigint,
  confirmation_status     text,
  failure_class           text,
  failure_detail          text,
  submission_attempts     integer     NOT NULL DEFAULT 0 CHECK (submission_attempts >= 0),
  idempotency_key         text        NOT NULL,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  submitted_at            timestamptz,
  confirmed_at              timestamptz,
  superseded_at           timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS decision_receipt_solana_commitments_idempotency_uq
  ON public.decision_receipt_solana_commitments (idempotency_key);

CREATE UNIQUE INDEX IF NOT EXISTS decision_receipt_solana_commitments_active_receipt_uq
  ON public.decision_receipt_solana_commitments (receipt_id)
  WHERE superseded_at IS NULL AND status <> 'SUPERSEDED';

CREATE INDEX IF NOT EXISTS decision_receipt_solana_commitments_receipt_idx
  ON public.decision_receipt_solana_commitments (receipt_id);

CREATE INDEX IF NOT EXISTS decision_receipt_solana_commitments_status_idx
  ON public.decision_receipt_solana_commitments (status, updated_at);

COMMENT ON TABLE public.decision_receipt_solana_commitments IS
  'Off-chain lifecycle for Solana memo commitments binding to decision receipt payload_hash digests.';

ALTER TABLE public.decision_receipt_solana_commitments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.decision_receipt_solana_commitments FROM public, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.decision_receipt_solana_commitments TO service_role;
