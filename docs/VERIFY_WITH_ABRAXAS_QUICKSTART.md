# Verify with Abraxas — developer quickstart

**Canonical developer entry:** [Integration Studio](/developers/integration-studio) → create sandbox → generate starter kit → run first sandbox verification.

One policy-agnostic integration primitive for relying applications. Abraxas owns the proof interaction; your application owns the customer experience.

**PartnerKit is source-level code in this repository** (`lib/partner/integrationKit`). It is not a published npm package yet.

## Canonical path (multi-instance safe)

The recommended integration uses **durable Hosted Partner Handoff** (`vr_*` request ids stored by Abraxas). Your server persists the returned `request_id` in **your own durable store** (Postgres, Redis, KV) before redirecting the holder. Any serverless instance can verify the callback.

Redirect mode (`req_*`) is a **legacy/advanced** path and requires a partner-implemented `PartnerRequestStateStore` — never process memory.

## 1. Create a sandbox application

Use [Integration Studio](/developers/integration-studio) or Partner Launchpad to create a sandbox integration. You receive:

- `partner_id`, `policy_id`, `application_id`, `binding_id`
- A sandbox API key (`abx_test_…`) — **shown once**, store server-side only

## 2. Choose a policy

Select an existing application/policy binding (for example age 21 retail or content origin disclosure). Pass `policyPackId` and optional `expectedContentHash` when the pack requires artifact binding.

## 3. Configure callback

Allowlist your HTTPS callback URL on the partner application. **Callback query params are not authorization.**

## 4. Store sandbox credentials server-side

```bash
ABRAXAS_SANDBOX_API_KEY=abx_test_…   # required for canonical path; never in client bundles
ABRAXAS_APP_ID=app_…
ABRAXAS_PARTNER_ID=partner-…
ABRAXAS_POLICY_ID=partner-…-v1
ABRAXAS_PACK_ID=age_21_retail
ABRAXAS_BASE_URL=https://abraxasworld.xyz
```

## 5. Install / import PartnerKit

```typescript
import { AbraxasPartnerKit, permitProtocolAction } from "@/lib/partner/integrationKit";
```

## 6. Create verification request (server)

```typescript
const kit = new AbraxasPartnerKit({
  partnerId: process.env.ABRAXAS_PARTNER_ID!,
  policyId: process.env.ABRAXAS_POLICY_ID!,
  policyPackId: process.env.ABRAXAS_PACK_ID,
  environment: "sandbox",
  applicationId: process.env.ABRAXAS_APP_ID,
  apiKey: process.env.ABRAXAS_SANDBOX_API_KEY,
  baseUrl: process.env.ABRAXAS_BASE_URL,
});

const request = await kit.createVerificationRequest({
  returnUrl: "https://your-app.example.com/auth/abraxas/callback",
  // expectedContentHash: "<sha256-hex>", // content_origin_disclosure packs only
});
if (!request.ok) throw new Error(request.errors.join(", "));

// Persist request.request_id in YOUR durable database before redirect (any instance can verify later)
await db.savePendingVerification({ requestId: request.request_id, orderId });
```

Missing sandbox credentials fail closed (`api_key_required`) — there is **no silent downgrade** to redirect mode.

## 7. Launch Hosted Partner Flow

Pass `request.verification_url` to your UI or redirect. **Never expose API keys to the browser.**

## 8. Verify callback server-side

```typescript
const pending = await db.loadPendingVerification(orderId);
const verified = await kit.verifyCallbackWithNarrowResult({
  search: callbackSearchParams,
  expectedRequestId: pending.requestId,
});
if (!verified.ok || !permitProtocolAction(verified.verification)) {
  // fail closed
}
```

## 9. Retrieve narrow result

Use `verified.narrow` only — policy-specific authorized facts. No DOB, raw documents, artifact_id, or unrelated Passport data.

## 10. Resume native action

Grant your gated action only after server verification. Use durable idempotency keys so duplicate callbacks cannot repeat protected actions.

---

**Legacy redirect mode:** pass `mode: "redirect"` and configure `requestStateStore` on the kit. See `PartnerRequestStateStore` in PartnerKit exports.

**Advanced:** direct `/partner/verify` URL construction remains at `/docs/partner-flow`.

**Reference:** `examples/verify-with-abraxas-external/` (durable store adapters, import-boundary tests).
