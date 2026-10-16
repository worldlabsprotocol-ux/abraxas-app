# Dependency boundary audit (Build #587)

## Shipped in the default bundle

Cryptographic verification stack reused from Abraxas `lib/`:

- `lib/institutionalVerification/*` — public SDK contract
- `lib/institutionalCertification/build546/*` — independent verifier + external RP harness
- `lib/institutionalCertification/build547/receiptConsumptionStore` — consumption subpath export
- `lib/decisionReceipts/*` (verification, signing verify path, registry lifecycle)
- `lib/protocol/proofFirst/*`, `lib/protocol/portableRevocation/*`
- Privacy selective disclosure enforcement used by presentation binding

## Explicitly excluded or stubbed at bundle time

| Dependency | Reason |
|------------|--------|
| `@/lib/supabase/admin` | Stub throws — no database trust root |
| `@/lib/partner/onchainVerifierConformance/*` | Stub — optional chain conformance not in default SDK |
| Next.js, React, app routes | Not imported |
| `lib/partner/launchpad/policyPacks` | Decoupled via `viewsPartner.ts` for public receipt views |

## Repository-only coupling removed for packaging

- `toPartnerView` moved to `lib/decisionReceipts/viewsPartner.ts` so the SDK bundle does not pull the Launchpad policy catalog.

## Integrator responsibilities

Durable `ReceiptConsumptionStore`, authenticated revocation material, and digest v2 pins remain institution-controlled.
