# Build #592 — Authorized sandbox → external verification

## Goal

Produce **external** relying-party proof with `@abraxas/institutional-verification` on infrastructure you control. Abraxas integration events (`receipt_verification_succeeded`) are telemetry only.

## Operator checklist

1. **Launchpad** — sandbox application with `sandbox_institutional_protocol_access`, callback URL, `abx_test_…` API key.
2. **Hosted holder** — open hosted verification URL, complete permitted holder consent on `/partner/verify`.
3. **Receipt** — persist `signed_record` JSON from callback or export (partner-safe fields only).
4. **External RP host** — pin trust registry + digest v2, durable consumption directory, institution-operated revocation feed with freshness bounds.
5. **Run evidence script** on the RP host (not Abraxas Supabase as trust root):

```bash
export BUILD592_PARTNER_API_KEY=abx_test_…        # optional: live HTTP journey
export BUILD592_APPLICATION_ID=<uuid>             # optional
export BUILD592_SIGNED_RECEIPT_PATH=./receipt.json
export RP_PARTNER_ID=<receipt partner_id>
export RP_POLICY_ID=<receipt policy_id>
export RP_CONSUMPTION_DIR=/var/lib/your-rp/consumption
export RP_REVOCATION_ADAPTER=institution_operated
export RP_REVOCATION_FEED_MAX_AGE_SECONDS=300
export RP_REVOCATION_FEED_OBSERVED_AT=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)
export RP_REVOCATION_FEED_JSON='{"available":true,"status":"active","observed_at":"…"}'
export ABRAXAS_RECEIPT_VERIFICATION_REGISTRY='[…]'
export ABRAXAS_RECEIPT_KEY_DOCUMENT_DIGEST=<digest v2 pin>

npm run build-592:sandbox-external-evidence
```

Output: `build592-external-verification-report.json` with `external_verification_proof` when inputs are complete.

## Cloud agent boundary

Without operator credentials and a holder-authorized receipt, the script reports **blocked** at `hosted_holder_authorization` and does **not** claim live E2E pass.
