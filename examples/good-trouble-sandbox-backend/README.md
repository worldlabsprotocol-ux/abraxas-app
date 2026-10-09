# Good Trouble sandbox — partner receipt verification (reference)

**Simulated partner backend** inside the Abraxas repo. This is not a live Good Trouble Wix deployment.

## Flow (Colosseum demo)

1. **Holder (Solana Seeker):** Good Trouble hosted handoff → Passport session → L0 DOB → Share → signed sandbox receipt → Return.
2. **Partner callback:** Browser lands on allowlisted URL with `receipt_id` (+ partner-local `gtv` flow token).
3. **Partner server (this example):** `verifyGoodTroubleSandboxAccess()` fetches `GET /api/receipts/{receipt_id}/public` and runs `AbraxasPartnerKit.verifyForAction` with:
   - partner `good-trouble`
   - policy `good-trouble-age_21_retail-v1`
   - **policy version 2** (L0 self-attestation pin)
   - sandbox environment
4. **Decision:** narrow **Permit** or **Deny** — callback query params alone never grant access.

## Run the demo (fixtures)

```bash
npm run good-trouble:sandbox-partner-verify-demo
```

Optional live public receipt check (still server-side, no secrets printed):

```bash
ABRAXAS_BASE_URL=https://abraxasworld.xyz \
GOOD_TROUBLE_RECEIPT_ID=dr_your_sandbox_receipt \
npm run good-trouble:sandbox-partner-verify-demo
```

## Production-shaped notes

- Persist `request_id` from handoff creation in durable storage; pass as `expectedRequestId` on callback.
- Use `protectedActionStore` (or DB idempotency) so checkout unlock cannot replay.
- Validate `gtv` against your Wix session separately — Abraxas verification ignores `gtv`.

Implementation: `lib/goodTrouble/sandboxPartnerVerification.ts`
