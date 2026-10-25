# Design partner sandbox — independence proof

Validates that a developer can verify Abraxas decisions **without** importing Abraxas application backend modules (`@/lib`).

## What this folder is

- Documentation anchor for Build #828.
- Automated proof via `independenceProof.test.ts` (synthetic fixtures only).

## What this folder is not

- A simulated external customer.
- A substitute for live sandbox credentials or holder wallet runs.

## Run

From repository root:

```bash
npm run test:build-828-design-partner-readiness
```

## Live sandbox (partner machine)

Follow `docs/integration/design-partner/QUICKSTART.md`. Minimal portable path:

```bash
export RP_PARTNER_ID=<sandbox partner_id>
export RP_POLICY_ID=<sandbox policy_id>
export RP_TRUST_ANCHOR_PATH=examples/portable-relying-party/trust-config.demo.template.json
export RP_ABRAXAS_BASE_URL=https://abraxasworld.xyz
npx tsx examples/portable-relying-party/verifyPortableReceipt.ts <receipt_id>
```

Manual steps: API key, callback allowlist, holder authorization — see handoff docs.
