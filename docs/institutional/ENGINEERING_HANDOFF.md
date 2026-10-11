# Institutional eligibility — engineering handoff (Build #525)

**Status:** Implementation + isolated test evidence. **Not** an independent security audit or production verification.

## API specification

- Contract version: `institutional_integration_v1`
- Machine-readable: `docs/institutional/institutional-integration.openapi.yaml`
- TypeScript: `lib/institutional/integration/institutionalIntegrationContract.ts`

## Reference integration

- Client: `lib/institutional/integration/InstitutionalReferenceClient.ts`
- Harness: `lib/institutional/integration/institutionalIntegrationHarness.ts`
- Example runner: `examples/institutional-reference-integration/run-harness.ts`

Run locally (no live credentials required for shape/webhook stages):

```bash
npx tsx examples/institutional-reference-integration/run-harness.ts
```

## Security and privacy boundaries

| Inside Abraxas | Partner receives |
|----------------|------------------|
| IDV artifacts, raw claims | Signed receipt + narrow result |
| Signing keys | Signature + key id reference |
| Replay nonce plaintext | HMAC hash in Postgres only |

## Failure semantics

- Fail-closed on missing durable replay store (`503 replay_store_unavailable`).
- Replay nonces reserved on **permit path only** (`permit_path_only`).
- Deterministic error codes mapped in `INSTITUTIONAL_HTTP_STATUS_BY_ERROR`.

## Sandbox vs production

| Capability | Sandbox | Production |
|------------|---------|------------|
| Institutional consume | Requires migrations 139+140 on connected DB | Same + operator approval |
| Mainnet Solana issuance | Disabled | Disabled until governance PASS + approval |

## Sandbox activation (Build #526)

Operator runbook: `docs/institutional/SANDBOX_ACTIVATION.md`

```bash
npx tsx scripts/institutional-sandbox-activation-preflight.ts
npx tsx scripts/institutional-replay-migration-rehearsal-gate.ts
npx tsx scripts/institutional-integration-proof-packet.ts
```

## Integration acceptance tests

```bash
npm run test:institutional-526
npm run test:institutional-replay-postgres   # when INSTITUTIONAL_REPLAY_TEST_DATABASE_URL set
```

## Known limitations

- Dual-RPC independence is hostname-heuristic only; same operator endpoints remain BLOCKED.
- Simulated E2E tests do not prove live Supabase/Partner Flow without environment configuration.
- Vercel READY ≠ production institutional readiness (explicit readiness gate).

## Security review status

Internal package: `docs/security/CREDENTIAL_API_SECURITY_REVIEW_PACKAGE.md` — **not** third-party audit.

## Production activation checklist

1. Apply migrations **139** and **140** on DEMO, validate admin readiness probe.
2. Confirm `production_consume_available: true` on `/api/admin/institutional-plane/readiness`.
3. Configure distinct Solana observation RPC providers; archive governance evidence script output.
4. Run external team against sandbox credentials with reference client.
5. Independent security audit (out of scope for this document).
