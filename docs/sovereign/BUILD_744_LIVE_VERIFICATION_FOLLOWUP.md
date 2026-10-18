# Follow-up PR scope (post #744) — live holder verification

PR #744 establishes sovereign Launchpad **sandbox** execution: resolve, credentials, harness-signed receipts, HTTP boundaries, and API key auth via PostgreSQL.

## Not in #744 (intentional)

- Live hosted holder handoff (Supabase `hostedHandoff` store) — **501 fail-closed** in sovereign mode
- Production lifecycle RPCs, webhooks outbox, settlement, policy change-control schema
- `issueReceiptForDecision` persistence on Supabase for holder-completed IDV flows

## Next PR should deliver

1. Sovereign schema for verification **sessions** (holder consent, policy binding, expiry, replay nonce)
2. Evidence intake adapters (authorized test issuer + production issuer registry) — no fixture pass without `harness: true`
3. Policy evaluation against **actual** evidence artifacts
4. Signing via existing `lib/decisionReceipts/signing.ts`; store references in `partner_launchpad_signed_receipts`
5. Public/partner verification endpoints with independent crypto validation (extend `receipts/validate`)
6. End-to-end HTTP tests: holder completes flow → receipt → partner validates offline

## Operator prerequisite

Independent PostgreSQL per `SOVEREIGN_OPERATOR_REQUIREMENTS.md` before calling Production sovereign.
