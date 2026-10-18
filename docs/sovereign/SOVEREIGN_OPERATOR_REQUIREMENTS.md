# Sovereign PostgreSQL operator requirements (Build #744)

Independent Abraxas runtime (native Solana account + Launchpad) expects:

## Database

- PostgreSQL 16+ (standard wire protocol; not Supabase PostgREST)
- TLS in production (`sslmode=verify-full` or equivalent)
- Private network reachability from Vercel (static egress IP allowlist or secure tunnel)
- Roles: migration superuser separate from `abraxas_runtime` (see `000_sovereign_bootstrap.sql`)
- Connection pooling at app layer (`pg` pool in `lib/persistence/pgPool.ts`) or external pooler (PgBouncer)
- Migrations: `node scripts/sovereign/apply-native-account-migrations.mjs` against `ABRAXAS_DATABASE_URL`

## Secrets (Vercel / operator vault)

- `ABRAXAS_DATABASE_URL` — runtime DSN for `abraxas_runtime`
- `ABRAXAS_SOVEREIGN_NATIVE_ACCOUNT=1` and `ABRAXAS_PERSISTENCE_BACKEND=postgres_direct`
- `ABRAXAS_ACCOUNT_SESSION_SECRET` — account + partner console session JWT
- Receipt signing keys per existing decision receipt configuration (not stored in Postgres as trust root)

## Operations

- Automated backups and tested restore
- Query latency / error monitoring on pool checkout failures
- Disk growth on `partner_launchpad_activity`, `partner_launchpad_signed_receipts`, audit tables

Production is **not** sovereign until this database is provisioned independently of Supabase and env flags are set accordingly. Do not point sovereign mode at `*.supabase.co` hosts (`validateSovereignNativeAccountDatabase` fails closed).
