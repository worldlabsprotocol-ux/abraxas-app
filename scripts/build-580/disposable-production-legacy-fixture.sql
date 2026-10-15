-- Build #580: synthetic legacy schema for disposable migration integration tests (not Production data).

create table if not exists public.identity_verifications (
  wallet_address text not null,
  sui_address text,
  status text not null default 'pending',
  identity_verification_status text,
  credential_status text,
  updated_at timestamptz not null default now()
);

create table if not exists public.passport_documents (
  id text primary key,
  sui_address text,
  stamp_id text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.identity_review_sessions (
  id text primary key,
  sui_address text not null,
  review_status text not null default 'pending',
  partner_id text,
  verification_request_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.identity_biometric_assessments (
  id text primary key,
  sui_address text not null,
  created_at timestamptz not null default now()
);
