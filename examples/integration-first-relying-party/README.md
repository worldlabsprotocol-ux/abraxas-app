# Integration-first relying party (Build #821)

**Synthetic sandbox only** — demonstrates how a partner application integrates Abraxas trust **without** running Abraxas infrastructure for verification.

## Integrator journey (7 steps)

| Step | Owner | Runtime dependency |
|------|--------|-------------------|
| 1. Request narrow policy-bound verification | Partner app | Abraxas hosted handoff / PartnerKit (issuance path) |
| 2. Holder wallet authorization | Wallet + holder | Wallet interface |
| 3. Signed decision + status channel | Abraxas issuer | Abraxas-operated issuance & status signing |
| 4. Pin trust anchor | Partner security | **None** (out-of-band document) |
| 5–7. Verify, enforce scope, permit action | Partner app | **`@abraxas/independent-verifier` only** |

Steps **4–7** do not require Supabase, PostgREST, or the Abraxas website at verify time.

Production integrators must obtain **fresh** signed status statements (within the pinned anchor max-age). Synthetic fixtures use a fixed observe time in tests; live integrations poll or push status from Abraxas.

## Minimal verification setup (4 artifacts)

1. `trust-anchor-bundle.json` — pinned out-of-band  
2. `issuer-authority-statement.json` — anchor-signed issuer registry snapshot  
3. `decision-receipt.json` — Ed25519 signed receipt  
4. `signed-status-statement.json` — status signer authorized in SIAS  

Committed copies: `fixtures/` (regenerate with `npx tsx examples/integration-first-relying-party/build-fixtures.ts`).

## Code surface

- `relyingParty.ts` — `verifyPortableDecision`, `permitScopedAction` (copy into your service)
- `demo.ts` — end-to-end narrative + happy/wrong-audience checks
- `integration-first.test.ts` — reproducible PASS/FAIL (CI)

## Commands

```bash
npm ci
npx tsx examples/integration-first-relying-party/demo.ts
npx vitest run examples/integration-first-relying-party/integration-first.test.ts
```

Environment for CLI-style verify (see also `examples/independent-sias-verifier/`):

```bash
RP_PARTNER_ID=partner-integration-821 \
RP_POLICY_ID=policy-age21-sandbox-821 \
RP_ENVIRONMENT=demo \
npx tsx examples/independent-sias-verifier/verify.ts \
  examples/integration-first-relying-party/fixtures/decision-receipt.json \
  examples/integration-first-relying-party/fixtures/trust-anchor-bundle.json \
  examples/integration-first-relying-party/fixtures/issuer-authority-statement.json \
  examples/integration-first-relying-party/fixtures/signed-status-statement.json
```

## Issuance vs verification

| Concern | Requires Abraxas-operated services? |
|---------|-------------------------------------|
| Independent signature + SIAS + status verify | **No** |
| Fresh signed status / revocations | **Yes** (status signer + authoritative state) |
| Wallet-native holder step | **Yes** (hosted flow or partner-orchestrated wallet) |

## Related docs

- `docs/integration/BUILD_821_INTEGRATION_FIRST_INDEPENDENCE.md`
- `docs/VERIFY_WITH_ABRAXAS_QUICKSTART.md` (hosted issuance path)
- `packages/abraxas-independent-verifier/README.md`
