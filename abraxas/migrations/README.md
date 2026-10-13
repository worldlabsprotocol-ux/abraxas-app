# Abraxas database migration contract

Canonical SQL migrations live in **`/supabase/migrations/`** (historical path; **not** a Supabase platform lock-in).

- Apply with any PostgreSQL migration runner against self-managed or hosted Postgres.
- Rollback scripts: `/supabase/rollbacks/`
- Demo manifest: `scripts/demo/lib/demoMigrationManifest.ts`

Supabase CLI is optional convenience; **trust and schema semantics are Abraxas-owned.**
