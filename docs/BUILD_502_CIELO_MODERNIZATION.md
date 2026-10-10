# Build #502 — Cielo modernization & hospitality partner pilot

## Dependency

**PR #614 (Build #501)** was **open** at implementation time. This branch stacks on `cursor/cielo-sunrise-genesis-501-5ffe`. Merge #614 to `main` before promoting #502.

## Legacy → modern map

Authoritative machine-readable map: `CIELO_LEGACY_MODERN_COMPONENT_MAP` in `lib/partner/hospitality/rentalOperatorContract.ts`.

| Legacy surface | Classification | Modern anchor |
|----------------|----------------|---------------|
| `issueReceiptForDecision` | REUSE | Shared decision receipt + trust evaluation |
| `verifiedRateService` / `cielo_verified_rate_requests` | ADAPT | Tenant-scoped rental operator contract |
| `evaluateCieloVerifiedGuest` | ADAPT | Policy pack `age_21_retail` + existing rules |
| Partner Flow evaluate URL | REUSE | Optional hosted path for non-Cielo operators |
| Launchpad + sandbox keys | REUSE | Per-tenant application + pinned policy |
| USDC pay / treasury / stays | RETAIN SEPARATELY | Not part of eligibility pilot |
| Fixture query params | DEPRECATE LATER | Staging proof forbidden |

**Regression guard:** No second receipt issuer; Cielo continues `issueReceiptForDecision` with partner/policy binding.

## Hospitality policy contract

- Single narrow pack: **`age_21_retail`** → discloses **`age_eligible_21` only**
- No booking approval semantics; operator may apply own review queue
- Versioning/consent/revocation via existing policy + receipt lifecycle

## Canonical rental operator integration

- `RentalOperatorTenantConfig` in `lib/partner/hospitality/rentalOperatorContract.ts`
- Cielo: `CIELO_SUNRISE_RENTAL_TENANT` (`first_party_property_ui`)
- Synthetic B: `SYNTHETIC_RENTAL_OPERATOR_B` (`hosted_partner_flow`) — **not a live customer**

## Portability proof

```bash
npm run hospitality:portability-proof
```

Offline verification of hosted URLs, callback parsing, and **cross-tenant receipt rejection**.

## Migration compatibility

`lib/cielo/legacyRequestCompatibility.ts` — historical `CVR-*` refs and operator statuses remain readable; no destructive migrations.

## Staging

Demo Supabase ref: `ocntwbxarpjeixdnzide`. Use `npm run cielo:staging-activate` (from #501). Live holder E2E **not claimed** without preview credentials and human review.

## Next milestone (#503)

- Merge #614 + #502; run live Cielo holder on preview without fixtures
- Launchpad provision helper for `rental-synthetic-operator-b` on demo DB (operator-only)
- Playwright slice for `/cielo/verified-rate` holder brief + consent receipt verify
