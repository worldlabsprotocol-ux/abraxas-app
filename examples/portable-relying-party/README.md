# Portable relying party (Build #826)

**Separate process example** — verifies Abraxas portable evidence using **`@abraxas/independent-verifier` only**. No `@/lib` Abraxas backend imports.

This is an internally controlled reference implementation, not external customer adoption.

## Developer setup (measured)

| Step | Action | Abraxas backend at verify time? |
|------|--------|----------------------------------|
| 1 | Pin trust anchor JSON out-of-band (`trust-config.demo.template.json` → your secure store) | No |
| 2 | Configure `RP_PARTNER_ID`, `RP_POLICY_ID`, `RP_ENVIRONMENT` | No |
| 3 | `GET /api/receipts/{id}/portable-verification` once to retrieve bundle | **Fetch only** |
| 4 | Match bundled anchor to pin; run `verifyAbraxasReceiptIndependently` | **No** |
| 5 | Map to `permit` / `deny` / `indeterminate` (`enforceDecision.ts`) | No |

**Runtime dependencies:** Node 20+, `@abraxas/independent-verifier`, `fetch`.

## Live Demo (optional)

```bash
export RP_PARTNER_ID=studio-accept-wc-1792620888278-6a4a2447dfc8
export RP_POLICY_ID=studio-accept-wc-1792620888278-6a4a2447dfc8-wallet_control-v1
export RP_ENVIRONMENT=demo
export RP_ABRAXAS_BASE_URL=https://demo.abraxasworld.xyz
export RP_TRUST_ANCHOR_PATH=examples/portable-relying-party/trust-config.demo.template.json

npx tsx examples/portable-relying-party/verifyPortableReceipt.ts dr_jSXuDfM_pFMT36du
```

Expected for the genuine expired Demo receipt: **`action: deny`**, `cryptographically_authentic: true`, exit code `3`.

## Partner Kit (hosted issuance + same verify semantics)

For apps already using `AbraxasPartnerKit`:

- `fetchPortableVerificationBundle(receiptId)`
- `enforceStandalonePortableVerification(receiptId)` → explicit `permit` | `deny` | `indeterminate`
- `loadIntegratorTrustAnchorFromEnv()` for `ABRAXAS_INTEGRATOR_TRUST_ANCHOR_JSON` / `_PATH`

See `docs/integration/BUILD_826_INDEPENDENT_PARTNER_INTEGRATION_READINESS.md`.

## Trust continuity (Build #827)

Durable minimum signed-status floors across restarts and explicit anchor registry semantics (Partner Kit or standalone file checkpoint):

| Step | Action |
|------|--------|
| 1 | Pin or registry JSON out-of-band |
| 2 | Treat callback `receipt_id` as handle only |
| 3 | Fetch portable bundle once |
| 4 | Verify with `@abraxas/independent-verifier` + checkpoint floors |
| 5 | Commit checkpoint when status evidence is authentic |
| 6 | `permit` / `deny` / `indeterminate` |
| 7 | Follow `next_actions` on failure (rotation, stale status, corruption) |

```bash
export RP_CHECKPOINT_PATH=examples/portable-relying-party/checkpoints.demo.json
npx tsx examples/portable-relying-party/verifyWithContinuity.ts dr_jSXuDfM_pFMT36du
```

Partner Kit: `enforcePortableVerificationWithTrustContinuity`, `ABRAXAS_INTEGRATOR_TRUST_REGISTRY_PATH`, `statusCheckpointStore` option.

See `docs/integration/BUILD_827_PARTNER_TRUST_CONTINUITY.md`.
