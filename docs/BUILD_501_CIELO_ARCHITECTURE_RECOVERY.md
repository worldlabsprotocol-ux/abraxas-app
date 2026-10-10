# Build #501 — Cielo Sunrise architecture recovery

## Dependency

Build #500 merged (#613): `stagingActivationReadiness`, `partner:staging-activate`.

## What exists (functional)

| Area | Location | Status |
|------|----------|--------|
| Genesis asset UI | `/flagship`, `FlagshipAssetPage`, `ABX-RE-HOSP-001` | **Live** — property content + Airbnb external links |
| Verified guest policy | `cielo-verified-guest-v1`, `evaluateCieloVerifiedGuest` | **Live** — DB-backed; optional `CIELO_VERIFIED_RATE_FIXTURE` for UI only |
| Holder UI | `/cielo/verified-rate`, `CieloVerifiedRateFlow` | **Live** — Passport → consent → submit |
| Signed receipt | `grantCieloVerifiedGuestConsent` → `issueReceiptForDecision` | **Live** — production decision context |
| Request queue | `cielo_verified_rate_requests`, `/admin/cielo`, `CieloVerifiedRateQueue` | **Live** — operator PIN |
| USDC booking loop | `/cielo/pay`, stay_requests, treasury | **Separate** — not required for verified-guest milestone |
| Health checks | `lib/cieloE2eCheck.ts`, `/ops/cielo-e2e` | **Live** — env + table probes |

## Canonical merchant model (this build)

- **Partner id:** `cielo` (first-party row in `partners`)
- **Policy id:** `cielo-verified-guest-v1` (aligned with age_21 retail disclosure `age_eligible_21`)
- **Adapter:** `verifiedRateService.ts` — not generic Partner Flow evaluate URL
- **Receipt trust:** shared `issueReceiptForDecision` / public receipt APIs
- **Airbnb:** external URL only (`CIELO_AIRBNB_URL`) — no account integration

## Dormant / production-dependent

- On-chain passport stamps (`isPassportIssuerConfigured`) — optional for verified-rate pilot
- Mainnet USDC treasury — booking path only
- Fixture query `?fixture=` — **must not** be used for staging proof

## Genesis asset boundary

- `ABX-RE-HOSP-001` registry / verification layer seeds — **historical reference asset**, not guest PII
- Guest eligibility ≠ ownership verification ≠ booking payment
- No token minting in this merchant activation slice

## Staging

- Demo Supabase ref: `ocntwbxarpjeixdnzide`
- Command: `npm run cielo:staging-activate`
- Live holder: `/cielo/verified-rate` on preview with real Passport (no fixtures)

## Build #501 code additions

- `cieloMerchantProfile.ts`, `cieloStagingActivation.ts`, `cieloFunnelEvents.ts`
- `scripts/cielo-staging-activate.ts`
- Flagship verified-guest copy + Airbnb boundary
- Route security tests for consent/submit
