# Passport independent institutional verifier handoff

Design partners operate verification outside Abraxas identity databases.

For the institutional sandbox customer journey (Launchpad provisioning, hosted verification, milestone evidence), see [institutional-sandbox-activation-583.md](../institutional-sandbox-activation-583.md).

## What you receive

1. A **presentation bundle** JSON from the holder after they approve your scoped request.
2. Your **institution configuration** JSON that you maintain (public trust only).
3. Durable directories for **receipt consumption** and **revocation checkpoints** on your infrastructure.

## What you never receive

- Abraxas database access or identity document images.
- Private signing keys for issuers or receipts.
- Authority derived from the holder bundle alone.

## Institution configuration

```json
{
  "partner_id": "your-partner-id",
  "policy_id": "your-immutable-policy-id",
  "trust_env": {
    "ABRAXAS_RECEIPT_VERIFICATION_REGISTRY": "[...]",
    "ABRAXAS_PASSPORT_CREDENTIAL_ISSUER_REGISTRY": "[...]",
    "ABRAXAS_PORTABLE_REVOCATION_ISSUER_TRUST": "{ \"bindings\": [] }",
    "ABRAXAS_PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS": "[...]"
  }
}
```

Bootstrap rows are provisioned by your security team from authenticated publisher material, not from the holder bundle at verify time.

## Verify command

From the Abraxas repository root:

```bash
npm run build-569:verify-bundle -- ./bundle.json \
  --institution-config ./institution.json \
  --consumption-dir ./var/consumption \
  --checkpoint-dir ./var/checkpoints
```

Exit code `0` and `"ok": true` means authorization verified under your policy.

## Result contract

Success:

```json
{
  "ok": true,
  "stage": "relying_party",
  "identity_database_required": false,
  "abraxas_infrastructure_required": false
}
```

Failure stages include `institution_config`, `bundle_evidence`, `operational_stores`, `credential`, `presentation_custody`, and `relying_party`.

Common rejection codes include `issuer_untrusted`, `invalid_signature`, `credential_revoked_or_unknown`, `portable_revocation_issuer_trust_missing`, `bundle_receipt_partner_mismatch`, and replay markers on the relying party decision.

## Operational requirements

- `--consumption-dir` and `--checkpoint-dir` are mandatory on the CLI.
- In memory verification is test only inside Abraxas vitest, not a partner integration path.

## Bundle format

See `bundle-schema.md`.
