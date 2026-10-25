# Start here — first verification request (wallet-control pilot)

**One action:** create a server-side verification request and redirect the holder to Abraxas.

Everything else is reference material ([README](./README.md), [QUICKSTART](./QUICKSTART.md), security docs).

## Before you code (founder / ops — not in public chat)

You need a **single consistent host** for the whole pilot ([SANDBOX_ENVIRONMENT.md](./SANDBOX_ENVIRONMENT.md)):

- Sandbox `partner_id`, `policy_id`, `application_id`
- `abx_test_…` API key (delivered **securely**, never in docs or Slack)
- Callback URL allowlisted
- Demo trust anchor JSON (out-of-band)

## Step 1 — Environment (your server)

```bash
ABRAXAS_BASE_URL=https://demo.abraxasworld.xyz
ABRAXAS_PARTNER_ID=<from secure handoff>
ABRAXAS_POLICY_ID=<wallet_control policy from handoff>
ABRAXAS_APP_ID=<from secure handoff>
ABRAXAS_SANDBOX_API_KEY=<from secure channel — never commit>
```

Use **`environment: "sandbox"`** in Partner Kit. Set `RP_ENVIRONMENT=demo` for portable verify.

## Step 2 — Create the request (your server)

```typescript
import { AbraxasPartnerKit } from "@/lib/partner/integrationKit";

const kit = new AbraxasPartnerKit({
  partnerId: process.env.ABRAXAS_PARTNER_ID!,
  policyId: process.env.ABRAXAS_POLICY_ID!,
  environment: "sandbox",
  applicationId: process.env.ABRAXAS_APP_ID,
  apiKey: process.env.ABRAXAS_SANDBOX_API_KEY,
  baseUrl: process.env.ABRAXAS_BASE_URL,
});

const request = await kit.createVerificationRequest({
  returnUrl: "https://your-app.example.com/auth/abraxas/callback",
});
if (!request.ok) throw new Error(request.errors.join(", "));

// Persist request.request_id in YOUR database, then:
// redirect(holder, request.verification_url);
```

**Success:** you receive `verification_url` and `request_id`.

## Step 3 — What happens next

1. Holder completes wallet authorization on Abraxas (hosted UI).
2. Your callback receives params — verify server-side with `verifyCallbackWithNarrowResult` (see [QUICKSTART](./QUICKSTART.md)).
3. Optionally verify offline: `GET {ABRAXAS_BASE_URL}/api/receipts/{receipt_id}/portable-verification` + `@abraxas/independent-verifier` ([portable example](../../../examples/portable-relying-party/verifyPortableReceipt.ts)).

## Pilot policy

**Wallet control** — narrow scope: prove the holder controls the wallet; your app enforces permit / deny / indeterminate.

## Reference (read when stuck)

| Topic | Doc |
|-------|-----|
| Full 14-day flow | [QUICKSTART.md](./QUICKSTART.md) |
| Demo vs Production hosts | [SANDBOX_ENVIRONMENT.md](./SANDBOX_ENVIRONMENT.md) |
| Trust anchor install | [TRUST_ANCHOR.md](./TRUST_ANCHOR.md) |
| Errors | [ERRORS_AND_RECOVERY.md](./ERRORS_AND_RECOVERY.md) |
| Acceptance checklist | [PILOT_ACCEPTANCE_CHECKLIST.md](./PILOT_ACCEPTANCE_CHECKLIST.md) |
