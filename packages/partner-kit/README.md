# @abraxas/partner-kit

Server-side PartnerKit for Abraxas receipt verification and hosted partner flow integration.

**Status:** Prepared for publication — not yet available on the public npm registry.

## Install (monorepo / future npm)

```bash
npm install @abraxas/partner-kit
```

From this repository during development:

```bash
npm install @abraxas/partner-kit@workspace:*
```

## Server-side only

- Store `ABRAXAS_SANDBOX_API_KEY` / production API credentials in server environment variables.
- Never embed API keys in browser bundles or mobile client code.
- Callback query parameters and webhooks are **not** authorization — always call `verifyForAction` before granting access.

## Minimal example

```typescript
import { AbraxasPartnerKit, permitProtocolAction } from "@abraxas/partner-kit";

const kit = new AbraxasPartnerKit({
  partnerId: process.env.ABRAXAS_PARTNER_ID!,
  policyId: process.env.ABRAXAS_POLICY_ID!,
  policyVersion: 1,
  environment: "sandbox",
  applicationId: process.env.ABRAXAS_APP_ID,
  apiKey: process.env.ABRAXAS_SANDBOX_API_KEY,
  baseUrl: process.env.ABRAXAS_BASE_URL,
});

export async function handleCallback(search: URLSearchParams) {
  const result = await kit.verifyForAction({
    receiptId: search.get("receipt_id")!,
    callbackRequestId: search.get("request_id"),
    expectedRequestId: storedRequestIdFromYourDatabase,
  });

  if (!permitProtocolAction(result)) {
    return { grant: false, outcome: result.outcome, errors: result.errors };
  }

  return { grant: true, outcome: "permitted" };
}
```

## Sandbox vs production

- Sandbox and production credentials are distinct (`abx_sandbox_*` vs production keys).
- Sandbox receipts have `production_usable: false` — production mode rejects them fail-closed.
- Pin `environment: "sandbox" | "production"` on the kit instance to match your credential scope.

## Public API

See package exports in `src/index.ts`. Core entry points:

- `createVerificationRequest` — hosted handoff or redirect-mode request
- `verifyCallbackWithNarrowResult` — callback + current receipt + narrow result
- `verifyForAction` — **safety center** — fetch, validate, and fail-closed authorization check
- `permitProtocolAction(result)` — explicit permit gate
