# Supabase Migration 019 — Trust Registry

Run **after** migration 018.

## Important — use the complete file

> **Do not run INSERT-only patches.** If `credential_issuers` does not exist, you must run the **full** script that includes `CREATE TABLE`.

**Use this file:** `supabase/migrations/019_trust_registry_complete.sql`

(Or `019_trust_registry.sql` — same content after the audit_status fix.)

## Common errors

| Error | Cause | Fix |
|-------|-------|-----|
| `credential_issuers_audit_status_check` | `audit_status = 'pending_audit'` | Only `trust_status` may be `pending_audit`. `audit_status` must be `self_attested`, `reviewed`, or `contracted` |
| `relation "credential_issuers" does not exist` | Ran INSERT patch without CREATE TABLE | Run **019_trust_registry_complete.sql** from the top |

## Pre-flight

```sql
-- 018 tables should exist first
select table_name from information_schema.tables
where table_schema = 'public' and table_name = 'partner_policies';
```

## Verify after run

```sql
select id, legal_name, trust_status, audit_status from credential_issuers order by legal_name;
-- expect 4 rows; screening-partner: trust_status=pending_audit, audit_status=self_attested

select id, name from credential_schemas order by name;
-- expect 4 rows
```

## API

`GET /api/trust/registry`
