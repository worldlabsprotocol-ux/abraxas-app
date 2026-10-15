-- Build #577: read-only Production schema compatibility probes (founder execution).
-- Run against Supabase PostgreSQL with a read-only role. Do not apply migrations from this file.

-- Migration 140_passport_reusable_credential_state.sql
select exists (
  select 1 from information_schema.tables
  where table_schema = 'public' and table_name = 'passport_holder_possession_keys'
) as migration_140_possession_keys;

select exists (
  select 1 from information_schema.tables
  where table_schema = 'public' and table_name = 'passport_reusable_credentials'
) as migration_140_reusable_credentials;

select exists (
  select 1 from information_schema.columns
  where table_schema = 'public'
    and table_name = 'passport_reusable_credentials'
    and column_name = 'signed_credential_text'
) as migration_140_signed_credential_text_column;

-- Migration 141_passport_institutional_presentation_consent.sql
select exists (
  select 1 from information_schema.tables
  where table_schema = 'public' and table_name = 'passport_institutional_presentation_consents'
) as migration_141_consents;

-- Migration 142_passport_institutional_authorization_commits.sql
select exists (
  select 1 from information_schema.tables
  where table_schema = 'public' and table_name = 'passport_institutional_authorization_commits'
) as migration_142_authorization_commits;

-- Migration 143_passport_authorization_signing_claim.sql
select exists (
  select 1 from information_schema.columns
  where table_schema = 'public'
    and table_name = 'passport_institutional_authorization_commits'
    and column_name = 'signing_claim_token'
) as migration_143_signing_claim_columns;

-- Transaction invariants (indexes)
select indexname
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'passport_reusable_credentials',
    'passport_institutional_presentation_consents',
    'passport_institutional_authorization_commits'
  )
order by tablename, indexname;
