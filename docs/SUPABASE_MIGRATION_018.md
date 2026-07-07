# Supabase Migration 018 — Policy & Credential Claims

Run this migration **once** in your Supabase project before using the partner verifier API, `/api/credentials/claims`, or booking verification gates.

## Quick run (Supabase Dashboard)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**
2. Click **New query**
3. Paste the full contents of:

   `supabase/migrations/018_policy_verification.sql`

4. Click **Run**
5. Confirm success (no errors). You should see `Success. No rows returned`

## What this migration creates

| Table | Purpose |
|-------|---------|
| `wallet_bindings` | Links a subject (Sui address) to a wallet with binding method + timestamps |
| `credential_claims` | Normalized claims (`identity_verified`, `liveness_passed`, etc.) with issuer, expiry, status |
| `partner_policies` | JSON policy rules partners use for approve/deny decisions |
| `verification_requests` | Partner-initiated consent requests |
| `consent_receipts` | Record of what the user authorized to share |
| `verification_decisions` | Policy outcomes (`approved` / `denied` / `manual_review`) |
| `audit_events` | Append-only audit trail for verification decisions |

## Seeded policies (ready to use)

| Policy ID | Use case |
|-----------|----------|
| `abraxas-core-v1` | Browse / account — Passport Core only |
| `abraxas-booking-v1` | Verified stays — identity + liveness + wallet binding |
| `abraxas-rwa-us-v1` | US RWA pilot — adds screening within 24h |

## Verify migration worked

Run in SQL Editor:

```sql
select id, name, status from partner_policies order by id;
```

Expected: 3 rows (`abraxas-core-v1`, `abraxas-booking-v1`, `abraxas-rwa-us-v1`).

Check tables exist:

```sql
select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'credential_claims', 'partner_policies', 'verification_requests',
    'verification_decisions', 'consent_receipts', 'audit_events', 'wallet_bindings'
  );
```

## After migration — app env vars

Add to Vercel (optional in dev, required for partner API in production):

```bash
PARTNER_API_KEY=your-secret-partner-key
PARTNER_ID=abraxas
```

Existing vars still required for claims to populate:

```bash
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
VERIFF_API_KEY=
VERIFF_SECRET_KEY=          # or VERIFF_SECRET for idv webhook
ABRAXAS_SIGNING_KEY=
ABRAXAS_PUBLIC_KEY=
```

## How claims get populated

| Event | Claims written |
|-------|----------------|
| User signs in (zkLogin register) | `wallet_binding_confirmed` |
| Veriff approves ID | `identity_verified`, `government_id_verified`, `liveness_passed`, `screening_outcome` |
| Veriff declines | All active claims revoked + credential revoked |

## Test endpoints (after deploy)

```bash
# Check if booking needs ID verification
curl -X POST https://abraxas-app.vercel.app/api/verification/check-level \
  -H "Content-Type: application/json" \
  -d '{"sui_address":"0xYOUR_ADDRESS","action":"book_asset"}'

# List active claims for a wallet
curl "https://abraxas-app.vercel.app/api/credentials/claims?sui=0xYOUR_ADDRESS"
```

## Rollback (if needed)

```sql
drop table if exists audit_events cascade;
drop table if exists verification_decisions cascade;
drop table if exists consent_receipts cascade;
drop table if exists verification_requests cascade;
drop table if exists credential_claims cascade;
drop table if exists wallet_bindings cascade;
-- partner_policies: drop only if you added no custom policies
-- drop table if exists partner_policies cascade;
```

## Notes

- All new tables use RLS enabled; the app uses **service role** server-side only.
- `credential_claims` is separate from `abraxas_credentials` (JWT store) — claims are the policy engine source of truth.
- If migration 018 was already applied, re-running is safe (`create table if not exists`, `on conflict do nothing` on policies).
