# Build #826 — Independent partner integration readiness

## Baseline

- **#825 merged** — Demo status signer uses `resolveReceiptKeyRuntimeEnvironment` (not raw `NODE_ENV`).
- Live Demo acceptance (receipt `dr_jSXuDfM_pFMT36du`, SHA `3ac61db0…`) — **PASS**; do not re-run without regression target.

## Existing workflow (friction audit)

| Step | Surface today | Friction |
|------|----------------|----------|
| Start verification | Partner Flow redirect / `AbraxasPartnerKit.createVerificationRequest` | Multiple integration paths in docs |
| Holder authorization | Hosted Abraxas UI + wallet | Expected — wallet-native |
| Callback | `receipt_id` query param | Partners may trust URL without receipt verify |
| Online receipt check | `GET …/public` + `validatePartnerFlowPublicReceipt` | Requires live Abraxas for each check |
| Portable export | `GET …/portable-verification` | Requires issuer export env on deployment |
| Offline verify | `@abraxas/independent-verifier` | Pin not wired by default; indeterminate vs deny unclear |
| Enforcement | `permitProtocolAction` (online kit) | Standalone path returned only `ok: boolean` |

## Improvements (this build)

1. **`enforceStandalonePortableVerification`** — explicit `permit` | `deny` | `indeterminate` with `PartnerIntegrationOutcome` mapping; indeterminate never permits.
2. **`classifyStandalonePortableVerification`** — shared classification for tests and kit.
3. **`loadIntegratorTrustAnchorFromEnv`** — `ABRAXAS_INTEGRATOR_TRUST_ANCHOR_JSON` / `_PATH`.
4. **`examples/portable-relying-party/`** — verify script using **only** `@abraxas/independent-verifier` (no `@/lib` imports).
5. **`PORTABLE_VERIFICATION_INTEGRATION_STEPS`** in Partner Flow integrator kit docs content.

## Developer example

```bash
npm run test:build-826-portable-relying-party
```

Live Demo (optional):

```bash
export RP_PARTNER_ID=studio-accept-wc-1792620888278-6a4a2447dfc8
export RP_POLICY_ID=studio-accept-wc-1792620888278-6a4a2447dfc8-wallet_control-v1
export RP_TRUST_ANCHOR_PATH=examples/portable-relying-party/trust-config.demo.template.json
npx tsx examples/portable-relying-party/verifyPortableReceipt.ts dr_jSXuDfM_pFMT36du
```

## Safe defaults

- Bundled anchor informational until pin match (`assertBundledAnchorMatchesIntegratorPin`).
- Fetch failures → **indeterminate** (retry), not deny.
- Authentic expired receipt → **deny**, not indeterminate.
- Status max-age enforced by independent verifier (`status_statement_max_age_seconds` on pin).

## Not in scope

- External customer deployment proof
- Production issuer anchor publication
- New dashboards or parallel SDKs

## External adoption still requires

- Out-of-band trust anchor distribution and rotation runbook
- Production portable export + signing env (operator)
- Partner allowlisting and policy binding on Abraxas side
