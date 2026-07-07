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
select id, legal_name, trust_status from credential_issuers order by legal_name;
select id, name from credential_schemas order by name;
```

## API

`GET /api/trust/registry` — public issuers + schemas (falls back to in-code registry if tables missing).
