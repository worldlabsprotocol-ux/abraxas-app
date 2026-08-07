# x402 + Abraxas Partner Flow — testnet reference gateway

**TESTNET / DEMO ONLY.** This example shows how a **partner** (not Abraxas) combines:

1. **Abraxas eligibility** — signed Partner Flow decision receipt (`GET /api/receipts/{id}/public`)
2. **x402 v2 payment** — `PAYMENT-REQUIRED` → `PAYMENT-SIGNATURE` → facilitator verify/settle → `PAYMENT-RESPONSE`
3. **Protected resource** — synthetic JSON payload after both gates pass

**Not included:** Abraxas custody, mainnet payments, production paywalls, wallet creation, facilitator credentials in-repo, or database migrations.

**Network:** Base Sepolia only (`eip155:84532`).

Wire payloads follow the [official x402 v2 specification](https://github.com/x402-foundation/x402/blob/main/specs/x402-specification-v2.md).

---

## Safety contract

| Runtime | Route | Settlement | Fulfillment store |
|---------|-------|------------|-------------------|
| **Disabled** (default) | 404 | — | — |
| **Vercel / serverless** | 503 fail closed | blocked | file store never used |
| **Local demo** (`X402_REF_LOCAL_DEMO_MODE=true` on a non-serverless host) | enabled | enabled | `FileFulfillmentStore` (local-demo only, **not durable**) |
| **Remote testnet gateway** (no local-demo flag) | 402 only | 503 on `PAYMENT-SIGNATURE` | requires durable adapter (documented, **not implemented**) |

`FileFulfillmentStore` is a **local-demo** convenience for developer workstations. It is **not** durable across serverless instances and must **never** be described or relied on as production-grade storage.

---

## Architecture

```mermaid
sequenceDiagram
  participant Holder
  participant Abraxas as Abraxas (Partner Flow)
  participant Partner as Partner gateway (this example)
  participant Fac as External x402 facilitator

  Holder->>Abraxas: Partner Flow (browser)
  Abraxas-->>Holder: receipt_id (callback)
  Holder->>Partner: GET /resource?receipt_id=dr_…
  Partner->>Abraxas: GET /api/receipts/{id}/public
  Abraxas-->>Partner: signed public receipt
  alt receipt invalid / wrong partner / expired
    Partner-->>Holder: 403 (fail closed)
  else receipt valid, no payment
    Partner-->>Holder: 402 + PAYMENT-REQUIRED (x402 v2)
  end
  Holder->>Partner: GET /resource?receipt_id=dr_… + PAYMENT-SIGNATURE
  Partner->>Fac: POST /verify
  Fac-->>Partner: isValid
  Partner->>Fac: POST /settle
  Fac-->>Partner: transaction
  Partner->>Partner: durable fulfillment ledger (idempotent)
  Partner-->>Holder: 200 + synthetic resource + PAYMENT-RESPONSE
```

---

## Partner configuration (operator-supplied)

Set these environment variables on **your** gateway host. Abraxas does not store payment config. All URLs must be **HTTPS**. `pay_to`, `price_amount`, and `price_asset` are validated at startup.

| Variable | Required | Description |
|----------|----------|-------------|
| `X402_REF_GATEWAY_ENABLED` | yes | Must be `true` to expose the demo route |
| `X402_REF_PARTNER_ID` | yes | Abraxas pilot `partner_id` |
| `X402_REF_POLICY_ID` | yes | Sandbox/testnet policy id |
| `X402_REF_ABRAXAS_BASE_URL` | yes | HTTPS base URL, e.g. `https://abraxasworld.xyz` |
| `X402_REF_FACILITATOR_URL` | yes | HTTPS external facilitator base URL (you operate) |
| `X402_REF_PAY_TO` | yes | Valid EVM treasury on Base Sepolia (you custody) |
| `X402_REF_RESOURCE_URL` | yes | HTTPS canonical URL of this protected resource |
| `X402_REF_PRICE_AMOUNT` | no | Positive atomic USDC units (default `10000` = 0.01 USDC) |
| `X402_REF_PRICE_ASSET` | no | Official Base Sepolia USDC CAIP-19: `eip155:84532/erc20:0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| `X402_REF_LOCAL_DEMO_MODE` | local only | Must be `true` to enable file-store settlement on a non-serverless host |
| `X402_REF_FULFILLMENT_STORE_PATH` | local only | File path for local-demo ledger |
| `X402_REF_DURABLE_STORE_ADAPTER` | remote | Reserved for a future durable adapter — **not implemented** |

**Facilitator auth:** supply via your deployment platform (e.g. `Authorization` header). This repo does **not** ship facilitator secrets.

---

## Abraxas prerequisites (unchanged)

1. Operator-provisioned `partner_id`, `policy_id`, callback allowlist
2. Holder completes Partner Flow → `receipt_id` on callback
3. Sandbox policy (`production_usable: false`) for testnet pilots

See `examples/partner-flow-web-rp/README.md` and `docs/PARTNER_ONBOARDING_CHECKLIST.md`.

---

## Demo walkthrough

### 1. Obtain eligibility

Complete Partner Flow and capture `receipt_id` from the callback.

### 2. Request protected resource (no payment)

```bash
curl -si "https://YOUR_HOST/api/examples/x402-partner-flow-gateway/resource?receipt_id=dr_YOUR_RECEIPT"
```

On a **remote** testnet host without a durable adapter, this returns **402** with `PAYMENT-REQUIRED` (official x402 v2 JSON, Base64-encoded).

On **Vercel/serverless**, the route returns **503** (fail closed).

### 3. Pay and retry (local demo only)

On a **non-serverless** workstation with `X402_REF_LOCAL_DEMO_MODE=true` and a configured facilitator, retry with a valid `PAYMENT-SIGNATURE` header. The gateway:

1. Re-validates the Abraxas receipt (fail closed on expiry / partner mismatch)
2. Verifies payment with your facilitator (`POST /verify` with `paymentPayload` + `paymentRequirements`)
3. Settles via facilitator (`POST /settle`) — never fulfills on ambiguous settlement
4. Records fulfillment in the **local-demo file ledger** (idempotent replays return the same `200` + `PAYMENT-RESPONSE`)

### 4. Idempotent replay

Send the **same** `PAYMENT-SIGNATURE` again within the access grant TTL → **200** without a second settlement.

---

## Production fulfillment store (required for remote settlement)

Remote testnet gateways **must** implement a durable fulfillment-store adapter before payment settlement is permitted. Abraxas does **not** ship this adapter. Documented SQL schema (not applied):

```sql
-- See lib/x402/referenceGateway/fulfillmentStore.ts — FULFILLMENT_LEDGER_SQL_SCHEMA
```

Idempotency key:

```
SHA256(partner_id || resource_id || receipt_id || payment_payload_hash)
```

**Do not** rely on `FileFulfillmentStore` or in-memory deduplication for production fulfillment claims.

---

## Security boundaries

| Data | Logged / persisted by this example |
|------|-------------------------------------|
| `receipt_id`, `partner_id`, `policy_id`, settlement status | Allowed (correlation only) |
| Raw `PAYMENT-SIGNATURE`, JWTs, email, wallet addresses, identity claims | **Forbidden** |

Fail closed on: invalid receipt, wrong partner/policy, expired receipt, invalid payment, facilitator failure, settlement ambiguity, serverless file-store use, missing durable store on remote settlement, duplicate fulfillment conflicts.

---

## Code layout

| Path | Role |
|------|------|
| `lib/x402/referenceGateway/` | Testable gateway logic |
| `app/api/examples/x402-partner-flow-gateway/resource/route.ts` | Next.js demo route |
| `docs/X402_ABRAXAS_ARCHITECTURE.md` | Design context |
| `docs/X402_THREAT_MODEL.md` | Threat model |

Run tests:

```bash
npx vitest run lib/x402/referenceGateway lib/docs/x402ArchitectureDocs.test.ts app/api/examples/x402-partner-flow-gateway
```

---

## Future operator choices (not in this PR)

1. **Facilitator vendor** — CDP x402, self-hosted, or other v2-compatible service
2. **Treasury `pay_to`** — partner-controlled Base Sepolia address
3. **Production ledger** — Postgres / DynamoDB using the documented schema
4. **Mainnet** — out of scope; requires separate security review and policy hardening
