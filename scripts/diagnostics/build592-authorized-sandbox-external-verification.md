# Build #592 — Authorized sandbox → external verification

## Goal

Produce **external** relying-party proof with `@abraxas/institutional-verification` on infrastructure you control. Abraxas integration events (`receipt_verification_succeeded`) are telemetry only.

The JSON report is a **local execution record** (`592.v2`). It does not authenticate which operator ran the command unless separately proven.

## Operator checklist

1. **Launchpad** — sandbox application with `sandbox_institutional_protocol_access`, callback URL, `abx_test_…` API key.
2. **Hosted holder** — open hosted verification URL, complete permitted holder consent on `/partner/verify`.
3. **Holder journey provenance** — `BUILD592_LIVE_RECEIPT_ARTIFACT_PATH` / callback URL tenant-correlates identifiers only. **Authenticated holder completion** requires Launchpad integration export events (`holder_flow_completed`, `receipt_issued`, verification request) bound to the receipt when queried with sandbox API credentials + `BUILD592_APPLICATION_ID`.
4. **Receipt** — persist `signed_record` JSON (`BUILD592_SIGNED_RECEIPT_PATH`). Cryptographic authorization is separate from verified holder journey provenance.
5. **External RP host** — pin trust registry + digest v2, durable consumption directory, **durable portable revocation checkpoint directory**, **signed portable revocation snapshot**, and issuer trust.
6. **Run evidence script** on the RP host (not Abraxas Supabase as trust root):

```bash
export BUILD592_PARTNER_API_KEY=abx_test_…        # optional: live HTTP journey
export BUILD592_APPLICATION_ID=<uuid>             # optional
export BUILD592_SIGNED_RECEIPT_PATH=./receipt.json
export BUILD592_LIVE_RECEIPT_ARTIFACT_PATH=./live-e2e-artifact.json
export BUILD592_PORTABLE_REVOCATION_CHECKPOINT_DIR=/var/lib/your-rp/revocation-checkpoints
export BUILD592_PORTABLE_REVOCATION_SNAPSHOT_PATH=./portable-revocation.json
export BUILD592_PORTABLE_REVOCATION_ISSUER_TRUST_JSON='{…}'
export RP_PARTNER_ID=<receipt partner_id>
export RP_POLICY_ID=<receipt policy_id>
export RP_CONSUMPTION_DIR=/var/lib/your-rp/consumption
export ABRAXAS_RECEIPT_VERIFICATION_REGISTRY='[…]'
export ABRAXAS_RECEIPT_KEY_DOCUMENT_DIGEST=<digest v2 pin>

npm run build-592:sandbox-external-evidence
```

Output: `build592-external-verification-report.json` with separate execution steps (`passed` / `blocked` / `failed` / `not_attempted`). `overall_acceptance_completed` is `passed` only when live HTTP, holder attestation, live receipt provenance, external verifier, authorization, and proof generation all succeed. A green synthetic security matrix alone does not complete live acceptance.

## Cloud agent boundary

Without operator credentials, holder attestation, portable revocation snapshot, and pinned trust, the script reports **blocked** steps and exits `0` only as a diagnostic command (`diagnostic_command_ok`) — not as completed end-to-end acceptance.
