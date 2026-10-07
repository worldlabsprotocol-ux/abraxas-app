# PartnerKit (@abraxas/partner-kit)

PartnerKit is the canonical server-side integration surface for external partners verifying Abraxas decision receipts.

## Publication status

| Channel | Status |
|---------|--------|
| Monorepo workspace | `@abraxas/partner-kit` via `workspace:*` |
| Versioned tarball | See [PARTNER_KIT_DISTRIBUTION.md](./PARTNER_KIT_DISTRIBUTION.md) |
| Public npm | **Not published** — `UNLICENSED`; pending explicit licensing decision |

**Do not run `npm install @abraxas/partner-kit` from the public registry** — it is not published. External teams: install from the versioned tarball per [PARTNER_KIT_DISTRIBUTION.md](./PARTNER_KIT_DISTRIBUTION.md).

## Install (tarball)

```bash
npm install ./abraxas-partner-kit-0.1.0.tgz
```

## Server-side only

Store API credentials in server environment variables. Never embed in browser or mobile client code.

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

- [Distribution](./PARTNER_KIT_DISTRIBUTION.md)
- [External handoff](./EXTERNAL_INTEGRATION_HANDOFF.md)
- [Partner Flow integration](./PARTNER_FLOW_INTEGRATION.md)
- [Partner webhooks](./PARTNER_WEBHOOKS.md) — `@abraxas/partner-kit/webhooks`
