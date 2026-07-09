# Supabase migrations — which file to run

All migrations live in `supabase/migrations/`. Paste into **Supabase → SQL Editor → Run**.

## Fresh database (recommended path)

Run in order:

| Order | File | Required? |
|-------|------|-----------|
| 1 | `018_policy_verification.sql` | **Yes** — policies, claims, verification requests |
| 2 | `024_partner_api_keys.sql` | Recommended — partner keys + usage |
| 3 | `025_partners_registry.sql` | Recommended — partner org registry |
| 4 | `026_cielo_verified_rate.sql` | Optional — Cielo verified-rate (032 can create if skipped) |
| 5 | **`032_reconcile_sandbox_and_cielo_operator_workflow.sql`** | **Yes** — sandbox partner + Cielo operator workflow |

You do **not** need to run 028, 029, 030, or 031 if you run **032**.

## Existing database (unknown state)

If you are unsure whether 026–031 were applied:

1. Run the **PREFLIGHT** queries at the top of `032_reconcile_sandbox_and_cielo_operator_workflow.sql`
2. Run **032** once (idempotent — safe to re-run)
3. Run the **POST-MIGRATION VERIFICATION** queries at the bottom of 032

**Do not** paste 029, 030, and 031 separately if you are running 032 — 032 supersedes them.

## Prerequisites for 032

032 will **fail with a clear error** if `public.partner_policies` does not exist (run 018 first).

032 will **create if missing**:

- `partners` table + onboarding columns
- `external_asset_applications`
- `cielo_verified_rate_requests` + public events
- Cielo operator columns + `cielo_verified_rate_request_events`

## What 032 changes (data)

| Action | Target | Safe if missing? |
|--------|--------|------------------|
| Upsert | `abraxas-partner-sandbox` partner | Yes |
| Upsert | `partner-sandbox-gate-v1` policy (`sandbox_only: true`) | Yes |
| Repoint | `verification_requests.policy_id` FK from meridian → canonical | Yes (0 rows OK) |
| Repoint | partner_id / policy_id text in requests, decisions, consent, usage, audit | Yes |
| **Delete** | `meridian-investor-gate-v1` policy row | Only after repoint |
| **Delete** | `meridian-private-credit` partner row | Only after repoint |
| Insert | DEMO row `ABX-DEMO-LAND-001` (if absent) | Yes |

Real partner rows (`cielo`, `abraxas`, etc.) are **not** deleted.

## Production env

Keep `PILOT_TIER3_SCREENING` **unset or `false`** in Vercel production. Demo screening must not run in production.

## Partner keys + metrics

Admin partner keys and metrics APIs require **024 + 025 + 032** applied in Supabase. Confirm with post-migration verification queries before claiming “live” in marketing copy.

## Decision receipts (033)

After 018 (and ideally 032), run **`033_decision_receipts.sql`** to enable signed eligibility decision receipts. Preflight and post-migration verification queries are in the migration file comments.

## Trust Layer v1 (034 + 035)

After 033, run in order:

1. **`034_credential_status_registry.sql`** — status events, receipt claim dependencies
2. **`035_issuer_framework_trust_registry.sql`** — signing keys, partner issuer trust rules

See `docs/TRUST_LAYER.md` for API and architecture details.

## Abraxas Connect (036)

After 033–035, run **`036_connect_wallet_authority.sql`** for Connect authorization requests, persisted SIWE challenges, and partner webhooks.

See `docs/ABRAXAS_CONNECT.md`.
