# Design partner quickstart (sandbox)

## Prerequisites

- HTTPS callback URL you control (allowlisted on your sandbox application).
- Server-side secret store for `abx_test_…` API key (**never** in browser bundles).
- Node 20+ for examples.

## Day 1–2 — Enrollment and trust

1. **Sandbox application** — Sign in at [Integration Studio on Demo](https://demo.abraxasworld.xyz/developers/integration-studio) for the pilot ([SANDBOX_ENVIRONMENT.md](./SANDBOX_ENVIRONMENT.md)). Create a sandbox integration; record `partner_id`, `policy_id`, `application_id`, `binding_id`, and the one-time API key (secure channel only).
2. **Callback allowlist** — Add your exact callback URL on the application (Abraxas ops/founder step if self-serve UI is blocked).
3. **Trust anchor** — Install Demo or sandbox anchor JSON out-of-band ([TRUST_ANCHOR.md](./TRUST_ANCHOR.md)). Template: `examples/portable-relying-party/trust-config.demo.template.json`.
4. **Optional registry** — For rotation overlap later, use `IntegratorTrustAnchorRegistryV1` ([BUILD #827](../BUILD_827_PARTNER_TRUST_CONTINUITY.md)).

## Day 3–5 — Verification request and callback

5. **Partner Kit (server)** — Import from `@/lib/partner/integrationKit` in your app repo (monorepo consumers) or copy patterns from `examples/verify-with-abraxas-external/`.

```typescript
const kit = new AbraxasPartnerKit({
  partnerId: process.env.ABRAXAS_PARTNER_ID!,
  policyId: process.env.ABRAXAS_POLICY_ID!,
  environment: "sandbox",
  applicationId: process.env.ABRAXAS_APP_ID,
  apiKey: process.env.ABRAXAS_SANDBOX_API_KEY,
  baseUrl: process.env.ABRAXAS_BASE_URL ?? "https://abraxasworld.xyz",
  integratorPinnedTrustAnchor: /* load from env */,
  statusCheckpointStore: /* your File/Redis/Postgres adapter */,
});

const request = await kit.createVerificationRequest({
  returnUrl: "https://your-app.example.com/auth/abraxas/callback",
});
// Persist request.request_id in YOUR database before redirect.
```

6. **Launch** — Redirect holder to `request.verification_url`. Holder completes wallet authorization on Abraxas hosted UI (**no Google sign-in required** for wallet-native paths).
7. **Callback** — On return, use `receipt_id` / `request_id` only as handles:

```typescript
const verified = await kit.verifyCallbackWithNarrowResult({
  search: callbackSearchParams,
  expectedRequestId: pending.requestId,
});
if (!verified.ok || !permitProtocolAction(verified.verification)) {
  // fail closed
}
```

## Day 6–8 — Independent portable verification

8. **Fetch bundle once** — `GET /api/receipts/{receipt_id}/portable-verification` (public route; may 503 if export not configured on that deployment).
9. **Verify offline** — Match bundled anchor to your pin; run `@abraxas/independent-verifier`.

Standalone script (no Abraxas app imports):

```bash
export RP_PARTNER_ID=<your partner_id>
export RP_POLICY_ID=<your policy_id>
export RP_ENVIRONMENT=demo
export RP_ABRAXAS_BASE_URL=https://abraxasworld.xyz
export RP_TRUST_ANCHOR_PATH=examples/portable-relying-party/trust-config.demo.template.json
npx tsx examples/portable-relying-party/verifyPortableReceipt.ts <receipt_id>
```

Or Partner Kit:

```typescript
const result = await kit.enforcePortableVerificationWithTrustContinuity({
  receiptId,
});
// result.action: permit | deny | indeterminate
```

## Day 9–11 — Checkpoints and enforcement

10. **Persist floors** — After authentic status evidence, commit `minimum_status_version` and `minimum_registry_version` per receipt scope ([BUILD #827](../BUILD_827_PARTNER_TRUST_CONTINUITY.md)).
11. **Enforce** — Gate your product action only on `permit`. **Deny** expired/revoked/wrong audience. **Indeterminate** on fetch failure or stale status — retry, do not grant.

Continuity example:

```bash
export RP_CHECKPOINT_PATH=/var/your-app/abraxas-checkpoints.json
npx tsx examples/portable-relying-party/verifyWithContinuity.ts <receipt_id>
```

## Day 12–14 — Review

12. Complete [PILOT_ACCEPTANCE_CHECKLIST.md](./PILOT_ACCEPTANCE_CHECKLIST.md) with measured timestamps and receipt IDs (sandbox only).

## Manual steps (cannot be automated by partner alone)

| Step | Owner |
|------|--------|
| Sandbox API key issuance | Abraxas / founder |
| Callback URL allowlist | Abraxas ops or Integration Studio |
| Trust anchor distribution for target environment | Abraxas security + partner ops |
| Issuer portable export enabled on deployment | Abraxas ops (Demo/Production env vars) |
| Holder wallet authorization | End user / partner test holder |
