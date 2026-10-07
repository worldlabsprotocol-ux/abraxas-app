# @abraxas/partner-kit

Server-side PartnerKit for Abraxas receipt verification and hosted partner flow integration.

## Distribution

| Channel | Status |
|---------|--------|
| Monorepo workspace | `npm install @abraxas/partner-kit@workspace:*` |
| Versioned tarball | See repository `docs/PARTNER_KIT_DISTRIBUTION.md` |
| Public npm | **Not published** — `UNLICENSED`; pending licensing decision |

External teams: install from `abraxas-partner-kit-0.1.0.tgz` — not from the public npm registry.

```bash
npm install ./abraxas-partner-kit-0.1.0.tgz
```

## Server-side only

- Store `abx_test_*` / `abx_live_*` credentials in server environment variables.
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

## Subpath exports

- `@abraxas/partner-kit` — kit client, verification request helpers
- `@abraxas/partner-kit/trust` — public receipt trust evaluation
- `@abraxas/partner-kit/webhooks` — webhook signature verification

## Sandbox vs production

- Sandbox and production credentials are distinct (`abx_test_*` vs `abx_live_*`).
- Sandbox receipts have `production_usable: false` — production mode rejects them fail-closed.
- Pin `environment: "sandbox" | "production"` on the kit instance to match your credential scope.
