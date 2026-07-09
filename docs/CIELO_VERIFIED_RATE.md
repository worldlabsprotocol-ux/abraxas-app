# Cielo Verified Rate — Step 3 verified-rate request loop

Pilot flow: Passport unlocks a **verified-rate request** at Cielo — not a confirmed reservation, booking, or payment settlement.

## User flow

1. Open `/flagship` → **Check verified rate**
2. `/cielo/verified-rate` — 3 steps:
   - **Passport ready** — account, profile, wallet bind (30d)
   - **Consent & eligibility** — policy `cielo-verified-guest-v1`
   - **Submit request** — if APPROVED only
3. Confirmation at `/cielo/verified-rate/confirmation?ref=CVR-…`
4. Public record at `/verify/ABX-RE-HOSP-001` shows anonymized activity events

## Policy: `cielo-verified-guest-v1`

| Requirement | Required? |
|-------------|-----------|
| Passport account (zkLogin) | Yes |
| Profile (username or display name) | Yes |
| Wallet binding (signed, ≤30 days) | Yes |
| Consent receipt | Yes |
| Identity credential (Veriff) | **Optional** — pilot-gated |

Decisions: `APPROVED` · `MANUAL REVIEW` · `NOT ELIGIBLE`

## API routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/cielo/verified-rate/status?sui_address=` | Pre-flight Passport checks |
| POST | `/api/cielo/verified-rate/consent` | Consent + policy decision |
| POST | `/api/cielo/verified-rate/submit` | Create verified-rate request (approved eligibility only) |
| GET | `/api/cielo/verified-rate/request?ref=` | User status (session ownership required) |
| GET | `/api/admin/cielo/verified-rate` | Operator queue + detail (admin PIN) |
| PATCH | `/api/admin/cielo/verified-rate` | Operator actions (admin PIN) |

## Operator workflow (migration 031)

Admin queue at `/admin/cielo`:

| Filter | Operator action |
|--------|-----------------|
| Request received | Initial state after user submits |
| Pending review | Mark under review |
| Eligible | Mark eligible after operator review |
| Operator confirmed | Confirm contact sent to guest |
| Declined | Decline (reason required) |

Each action writes an immutable row to `cielo_verified_rate_request_events` and an `audit_events` entry.

User status page: `/cielo/verified-rate/confirmation?ref=CVR-…` (session must match submitter).

Public `/verify/ABX-RE-HOSP-001` shows anonymized event lines only — no guest PII.

## Database (migrations 026 + 031)

- `partner_policies` — seeds `cielo-verified-guest-v1`
- `cielo_verified_rate_requests` — pilot requests with decision/consent FKs
- `cielo_verified_rate_request_events` — immutable operator/subject timeline (031)
- Operator fields on requests: `assigned_to`, `operator_notes`, `contacted_at`, `reviewed_at`, `decided_at`, `decision_reason` (031)

Reuses existing: `verification_requests`, `consent_receipts`, `verification_decisions`, `audit_events`

## Test fixtures

Set `CIELO_VERIFIED_RATE_FIXTURE=approved|manual_review|not_eligible` in env, or append `?fixture=approved` to status URL for UI testing without real Passport data.

## Local test checklist

1. Run migrations **024**, **025**, **026**, **031** in Supabase
2. Sign in at `/passport`, bind wallet, save profile at `/verify` (Profile tab)
3. Visit `/cielo/verified-rate`, complete 3 steps
4. Confirm `CVR-…` reference on confirmation page
5. Check `/admin/cielo` verified-rate queue — mark under review → eligible → confirm contact
6. Revisit `/cielo/verified-rate/confirmation?ref=CVR-…` for live user status
7. Check `/verify/ABX-RE-HOSP-001` for public activity line (no PII)

## Production test checklist

Same as above on deployed URL. Verify:

- Identity is never shown as complete unless a real active credential exists
- Labels say **pilot verified-rate request**, never “confirmed booking”
- Revoked/expired wallet binding returns MANUAL REVIEW or NOT ELIGIBLE
