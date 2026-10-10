# Universal partner integration guide

For developers integrating **any** approved relying party — not Good Trouble-specific flows.

## Lifecycle (canonical)

1. Register a partner application (Partner Launchpad / Integration Studio).
2. Select a **policy pack** (e.g. age 21 retail) — server pins `policy_id` + version.
3. Abraxas validates capabilities against the pack (no client-supplied policy escalation).
4. Create an isolated **sandbox** application and rotate a sandbox API key (store securely; shown once).
5. Configure **allowed return URLs** (HTTPS for production; localhost allowed for sandbox only).
6. Generate a **starter kit** for your stack (Next.js, Express, Wix Velo, serverless).
7. Initiate verification via hosted `/partner/verify` or Partner Flow evaluate API.
8. Holder sees partner name, purpose, and disclosed result; completes required verification.
9. Abraxas evaluates **current** qualified evidence for that policy (reuse only when policy allows).
10. Abraxas issues a **signed decision receipt** (narrow disclosure).
11. Your backend verifies the receipt with `@abraxas/partner-kit/trust` — never trust query params alone.
12. Map result to permit / deny / unavailable in your product.
13. Request **production access** after sandbox harness + verified receipts — review is manual.

## Example Merchant (fictional)

| Field | Value |
|-------|--------|
| Display name | Example Merchant |
| `partner_id` | `example-merchant-protocol` (your provisioned id) |
| `policy_id` | Pinned by Launchpad from pack `age_21_retail` |
| Callback | `https://app.example-merchant.test/auth/abraxas/callback` |
| Environment | `sandbox` first |

Contract proof (offline + URL builders): `runIndependentPartnerContractProof()` in `lib/partner/universalIntegration`.

## Server-side receipt verification (required)

Use the same expectations as your pinned policy and tenant:

```typescript
import { validatePartnerFlowPublicReceipt } from "@abraxas/partner-kit/trust";

const result = validatePartnerFlowPublicReceipt(receiptFromYourBackend, {
  partnerId: YOUR_PARTNER_ID,
  policyId: YOUR_PINNED_POLICY_ID,
  mode: "production", // or sandbox rules for pilot keys
});

if (!result.ok) {
  // Fail closed — do not grant access
}
```

## Readiness phases (Launchpad health API)

`GET /api/launchpad/applications/:id/health` includes `universal_readiness`:

| Phase | Meaning |
|-------|---------|
| `not_configured` | Missing policy pin or callbacks |
| `configured` | Ready to rotate sandbox credential |
| `sandbox_testing` | Credential active; run harness + verify receipts |
| `sandbox_verified` | Harness passed + at least one verified receipt observed |
| `production_review_required` | Access request pending |
| `production_approved` | Approved; complete activation |
| `production_active` | Production credential + activation |
| `blocked` | Health checks blocked |
| `suspended_or_revoked` | Application suspended |

Starter kit download alone does **not** set `sandbox_verified`.

## CLI checks

```bash
# Conformance + Example Merchant contract proof
PARTNER_FLOW_RP_PARTNER_ID=... \
PARTNER_FLOW_RP_POLICY_ID=... \
PARTNER_FLOW_RP_RETURN_URL=https://your-app.example/callback \
PARTNER_FLOW_RP_BASE_URL=https://your-abraxas-origin \
npm run partner:universal-readiness
```

Legacy harness only: `npm run partner:conformance`.

## Troubleshooting

| Symptom | Likely cause | Action |
|---------|--------------|--------|
| `partner_mismatch` on verify | Receipt from another tenant | Bind verify to your `partner_id` |
| `policy_mismatch` | Wrong policy pin | Use Launchpad pinned `policy_id` / version |
| `receipt_expired` | TTL elapsed | Re-run holder flow |
| `signature_invalid` | Tampered payload or wrong key | Fetch trust keys; never trust client-only params |
| `sandbox_only` in production | Sandbox receipt in prod mode | Complete production activation |
| Callback never arrives | Wrong allowlist URL | Match exact callback URL in Launchpad |
| Harness blocked | Missing scenarios | Complete required harness cases in Launchpad |
| Production still blocked | Domain TXT not verified | Complete DNS verification for callback host |
| Webhook `action_required` | Schema / TEST EVENT | Configure signing secret; run webhook test stage |

## Privacy

Partners receive **decision metadata** only. Do not expect DOB, document images, or biometrics in receipts or webhooks. `sanitizePartnerPayload` strips forbidden keys if you mirror Abraxas patterns.

## What this guide does not cover

- Good Trouble Wix checkout (merchant-owned) — see `examples/good-trouble-wix/`.
- On-chain eligibility gates — optional; not required for standard Partner Flow receipts.
