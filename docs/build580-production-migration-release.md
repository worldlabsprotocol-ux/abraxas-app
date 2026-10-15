# Build #580: Production Passport migration release

Canonical product: https://abraxasworld.xyz  
Production database: Supabase PostgreSQL project ref `bztwutzprwsdrtqdpymf`.

## Read-only probes

1. `scripts/build-578/production-schema-probes.sql`
2. `scripts/build-579/production-migration-preflight.sql`
3. `scripts/build-580/production-migration-release-gates.sql`

Store JSON output with timestamp. Do not apply DDL from probe scripts.

## Release gates (code)

`evaluateProductionMigrationRelease()` in `lib/passport/productionMigrationRelease.ts` enforces:

- Authorized database identity
- Legacy `identity_verifications.sui_address` anchor
- No partial 136–143 drift
- Backup checkpoint + restore test attestation
- Founder authorization **and** matching `ABRAXAS_PRODUCTION_MIGRATION_RELEASE_TOKEN=build580-passport-136-143`

A single boolean is insufficient to arm Production execution.

## Reconciliation

1. Plan: `planLegacyIdentityBackfill`
2. Dry run: `executeLegacyIdentityReconciliationBatch({ mode: "dry_run", rows })`
3. Execute (operator authorized): `mode: "execute"` with `executionAuthorized: true`

## Regression

`npm run test:production-migration-580`

## Founder approvals (steps 6+)

See `PRODUCTION_RELEASE_SEQUENCE` in `productionMigrationRelease.ts`.
