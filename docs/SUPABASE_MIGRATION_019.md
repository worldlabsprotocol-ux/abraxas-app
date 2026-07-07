# Supabase Migration 019 — Trust Registry

Run after migration 018.

## Quick run

Paste `supabase/migrations/019_trust_registry.sql` in Supabase SQL Editor → Run.

## Creates

| Table | Purpose |
|-------|---------|
| `subjects` | Individual or organization identity records |
| `credential_issuers` | Trusted issuers (Veriff, Abraxas, screening partners) |
| `credential_schemas` | W3C-style schema registry |

## Verify

```sql
select id, legal_name, trust_status, audit_status from credential_issuers order by legal_name;
select id, name from credential_schemas order by name;
```

## Fix: audit_status error on screening partner

If you see `credential_issuers_audit_status_check` violation, the screening row used `audit_status = pending_audit` (invalid). Only `trust_status` may be `pending_audit`. Run:

```sql
insert into public.credential_issuers (
  id, legal_name, issuer_type, trust_status, supported_claims,
  jurisdictions, assurance_levels, credential_ttl_days, audit_status, metadata
)
values (
  'issuer:screening-partner',
  'Sanctions / AML Provider (partner-gated)',
  'screening_provider',
  'pending_audit',
  array['screening_outcome','wallet_risk_band'],
  array['US','global'],
  array['L1','L2'],
  1,
  'self_attested',
  '{"note":"Full AML program requires partner onboarding"}'::jsonb
)
on conflict (id) do nothing;
```

Then run the `credential_schemas` inserts from the migration file if those are still missing.

## API

`GET /api/trust/registry` — public issuers + schemas (falls back to in-code registry if tables missing).
