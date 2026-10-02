# Verify with Abraxas — developer quickstart

One policy-agnostic integration primitive for relying applications. Abraxas owns the proof interaction; your application owns the customer experience.

**PartnerKit is source-level code in this repository** (`lib/partner/integrationKit`). It is not a published npm package yet.

## 1. Create a sandbox application

Use [Integration Studio](/developers/integration-studio) or Partner Launchpad to create a sandbox integration. You receive:

- `partner_id`, `policy_id`, `application_id`, `binding_id`
- A sandbox API key (`abx_test_…`) — **shown once**, store server-side only

## 2. Choose a policy

Select an existing application/policy binding (for example age 21 retail or content origin disclosure). Do not fork the SDK per policy — pass `policyPackId` and optional `expectedContentHash` when the pack requires artifact binding.

## 3. Configure callback

Allowlist your HTTPS callback URL on the partner application. The browser returns here after proof; **callback query params are not authorization**.

## 4. Store sandbox secret server-side

```bash
ABRAXAS_SANDBOX_API_KEY=abx_test_…   # never in client bundles
ABRAXAS_APP_ID=app_…
ABRAXAS_PARTNER_ID=partner-…
ABRAXAS_POLICY_ID=partner-…-v1
ABRAXAS_PACK_ID=age_21_retail
ABRAXAS_BASE_URL=https://abraxasworld.xyz
```

## 5. Install / import PartnerKit

In this monorepo:

```typescript
import { AbraxasPartnerKit, permitProtocolAction } from "@/lib/partner/integrationKit";
```

External repos should copy or submodule the public kit surface only — no Supabase admin, no internal DB services.

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
// request.request_id, request.verification_url, request.expires_at
```

## 7. Launch Hosted Partner Flow

Pass `request.verification_url` to your UI (`<VerifyWithAbraxas verificationUrl={…} />`) or redirect from your own button. **Never expose API keys to the browser.**

## 8. Verify callback server-side

```typescript
const verified = await kit.verifyCallbackWithNarrowResult({
  search: callbackSearchParams,
  expectedRequestId: storedRequestId, // bind to the action you initiated
});
if (!verified.ok || !permitProtocolAction(verified.verification)) {
  // fail closed — category: invalid_callback, receipt_expired, policy_mismatch, …
}
```

## 9. Retrieve narrow result

Use `verified.narrow` only — policy-specific authorized facts (for example `over_21` or provenance disclosure fields). No DOB, raw documents, artifact_id, or unrelated Passport data.

## 10. Resume native action

Grant your gated action only after server verification. Guard duplicate callbacks with partner-owned idempotency (receipt verification can repeat safely).

---

**Advanced:** direct `/partner/verify` URL construction and manual receipt validation remain documented at `/docs/partner-flow` and `/docs/integration-kit`.

**Reference implementations:** Good Trouble (age), Reference Content Publisher (provenance), `examples/verify-with-abraxas-external/`.
