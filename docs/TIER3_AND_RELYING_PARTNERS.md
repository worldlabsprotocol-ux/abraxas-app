# Step 5 — Tier 3 eligibility + first external relying partner

## Overview

Step 5 adds **transaction-specific eligibility (Tier 3)** and registers **Meridian Private Credit** as the first external relying party running the Step 4 consent loop in production pilot.

## Tier model

| Tier | Meaning |
|------|---------|
| 0 | Account only |
| 1 | Wallet-bound Passport |
| 2 | Identity-verified Passport |
| 3 | Transaction-specific eligibility (screening, investor, KYB, asset claims) |

Tier 3 activates when the holder has at least one active Tier 3 claim:

- `screening_outcome`
- `accredited_status`
- `kyb_verified`
- `transfer_eligibility`
- `product_eligibility`
- `asset_ownership_reviewed`

## Meridian Private Credit (first external relying party)

- **Partner ID:** `meridian-private-credit`
- **Policy:** `meridian-investor-gate-v1`
- **Requires:** identity (L2+) · wallet binding · sanctions screening (24h)

Partners create requests server-side:

```http
POST /api/v1/verification-requests
Authorization: Bearer abx_live_…

{
  "policy_id": "meridian-investor-gate-v1",
  "requested_action": "investor_onboarding",
  "sui_address": "0x…"
}
```

## Holder APIs

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/passport/transaction-eligibility` | Tier 3 status + Meridian policy evaluation |
| POST | `/api/passport/pilot-screening` | Pilot screening claim (non-prod or `PILOT_TIER3_SCREENING=true`) |
| POST | `/api/passport/demo-partner-request` | Demo consent URL (supports Meridian policy) |
| GET | `/api/partners/registry` | Public external relying partner list |

## Screening partner API

```http
POST /api/v1/screening/outcome
Authorization: Bearer abx_live_…

{ "sui_address": "0x…", "outcome": "clear" }
```

Requires `verify:screening` scope (or `verify:requests` / `verify:credential`).

## Database (migration 028)

Run `supabase/migrations/028_meridian_relying_partner.sql`:

- Seeds `meridian-private-credit` in `partners`
- Seeds `meridian-investor-gate-v1` policy
- Adds `verify:screening` scope to existing API keys

## Local test checklist

1. Run migrations **018**, **024**, **027**, **028**
2. Sign in, bind wallet, complete identity (Tier 2)
3. Passport → **Apply pilot screening** (or POST screening API)
4. Confirm Tier 3 active on Passport
5. **Meridian consent flow** → approve → check partner access history
6. Server-side: create Meridian request with partner key, poll decision

## Environment

| Variable | Purpose |
|----------|---------|
| `PILOT_TIER3_SCREENING=true` | Enable pilot screening button in production |
| `PILOT_TIER3_SCREENING=false` | Disable pilot screening in dev |

Default: enabled in non-production, disabled in production unless explicitly set.
