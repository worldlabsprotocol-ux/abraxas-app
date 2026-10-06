# PartnerKit (@abraxas/partner-kit)

PartnerKit is the canonical server-side integration surface for external partners verifying Abraxas decision receipts.

## Publication status

The package **`@abraxas/partner-kit`** is **prepared/publishable** from this repository (`packages/partner-kit`). It is **not yet published** to the public npm registry.

Until publication, integrators working inside the Abraxas monorepo should depend on the workspace package. External teams should request a release candidate tarball or wait for npm publication.

## Install-first developer experience

```bash
npm install @abraxas/partner-kit
```

```typescript
import { AbraxasPartnerKit, permitProtocolAction } from "@abraxas/partner-kit";

const kit = new AbraxasPartnerKit({
  partnerId: "your-partner-id",
  policyId: "your-policy-v1",
  policyVersion: 1,
  environment: "sandbox",
  applicationId: process.env.ABRAXAS_APP_ID,
  apiKey: process.env.ABRAXAS_SANDBOX_API_KEY,
  baseUrl: process.env.ABRAXAS_BASE_URL ?? "https://abraxasworld.xyz",
});

// After holder returns to your callback URL:
const result = await kit.verifyForAction({
  receiptId: callbackReceiptId,
  callbackRequestId: callbackRequestId,
  expectedRequestId: serverStoredRequestId,
});

if (!permitProtocolAction(result)) {
  // deny — stale, revoked, wrong policy, environment mismatch, etc.
}
```

## Non-negotiable boundaries

| Rule | Detail |
|------|--------|
| Server-side only | API credentials never belong in browser code |
| Callback ≠ authorization | Query params are routing hints only |
| Receipt must be current | Re-fetch public receipt; signature alone is insufficient |
| `verifyForAction` is the gate | Permit only when `permitProtocolAction(result)` is true |
| Environment separation | Sandbox credentials and receipts must not authorize production actions |

## Hosted flow

1. `createVerificationRequest({ returnUrl, mode: "hosted_handoff" })` with server API key
2. Redirect holder to `verification_url`
3. On callback, `verifyCallbackWithNarrowResult` or `verifyForAction`
4. Grant access only when verification permits

## Related docs

- [Partner Flow integration](/docs/PARTNER_FLOW_INTEGRATION.md)
- [Partner verification requests](/docs/PARTNER_VERIFICATION_REQUESTS.md)
- [Partner webhooks](/docs/PARTNER_WEBHOOKS.md) — use `@abraxas/partner-kit/webhooks` for signature verification
