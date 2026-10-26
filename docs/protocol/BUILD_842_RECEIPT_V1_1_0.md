# Build #842 — Receipt v1.1.0 cryptographic binding

**Status:** Isolated design + verifier implementation. **Not** activated in Demo or Production issuance.

## 1. v1.0.0 limitations addressed

| Gap | v1.0.0 behavior | v1.1.0 addition |
| --- | --- | --- |
| Application scope | Partner + policy + environment in signed payload; Launchpad application scope enforced via **operational** validity (DB), not signature | Optional **`application_binding_ref`**: opaque HMAC scope digest from authoritative issuance context |
| Evidence reuse | Dependencies stored in **`decision_receipt_evidence_dependencies`** only; not cryptographically bound to receipt | Optional **`evidence_commitment`**: SHA-256 digest over canonical dependency entry list |
| Cross-app substitution | Same partner/policy receipts interchangeable at verify time | Relying party pins expected **`application_binding_ref`** |
| Commitment vs validity | Signed status covers **current** evidence freshness | Commitment is **issuance-time only**; does not imply claim truth or current validity |

**Unchanged:** Ed25519 over `payload_hash`, canonical JSON rules for 1.0.0, SIAS, signed status, permit/deny/indeterminate, pairwise pseudonym in payload.

## 2. Proposed v1.1.0 canonical fields

All v1.0.0 fields, with `schema_version: "1.1.0"`, plus:

| Field | Type | Required |
| --- | --- | --- |
| `application_binding_ref` | string \| null | Yes (null = no app-scoped binding) |
| `evidence_commitment` | object \| null | Yes (null = no dependency commitment) |

`evidence_commitment`:

```json
{
  "schema": "abraxas.evidence_commitment/v1",
  "digest": "<sha256 hex>",
  "entry_count": 0
}
```

Manifest entries (transported out-of-band with portable bundle, **not** re-proving current validity):

```json
{
  "dependency_type": "reusable_fact | source_receipt | derived_from",
  "fact_id": "<uuid or blinded ref>",
  "source_credential_id": "<uuid or null>"
}
```

## 3. Application binding model

- **Issuance:** `deriveApplicationBindingRef(scope, scopeSecret)` where `scope` includes partner, policy, policy_version, decision_context, and authoritative `launchpad_application_id`.
- **Verify:** Relying party supplies expected ref (from Launchpad onboarding). Verifier compares equality only. Expected ref is **never** taken from the receipt.
- **Mandatory scope:** `require_application_binding: true` fails closed when expectation or signed receipt binding is missing or mismatched.
- **Unscoped:** omit `require_application_binding` (and expected ref) for workflows that do not need app authorization.
- **Privacy:** Raw application id is not required on the public receipt.

## 4. Evidence commitment model

- **Digest:** `SHA256(EVIDENCE_COMMITMENT_DOMAIN || canonical_json({ schema, entries }))` with sorted entries.
- **Empty set:** Explicit zero `entry_count` and deterministic empty digest.
- **Mandatory policy:** `require_evidence_commitment: true` fails closed on missing commitment, missing manifest, digest mismatch, or entry count mismatch.
- **Low-entropy ids:** Use `blindEvidenceRef()` at issuance; `assessManifestReferencePrivacy()` rejects obvious PII-shaped or short linkable refs in manifests.
- **Not:** Proof of factual truth, claim validity, or current evidence state (signed status remains authoritative for that).

## 5. Backward compatibility

- **1.0.0 verification:** Unmodified code path in `@abraxas/independent-verifier`; records with v1.1 fields but `schema_version: "1.0.0"` fail integrity (`schema_downgrade_rejected`).
- **1.1.0 verification:** Extended canonical + phases `application_binding`, `evidence_commitment`.
- **No retrofit:** Existing signed 1.0.0 receipts are never rewritten.
- **Registry:** Issuer keys must list `"1.1.0"` in `schema_versions` before issuance activation.

## 6. Implementation (isolated)

- `packages/abraxas-independent-verifier/src/v1_1_0/*`
- `lib/decisionReceipts/schema/v1_1_0.ts` (re-exports; **not** wired to `service.ts`)
- Adversarial tests: `v1_1_0/adversarial.test.ts`

## 7. Upgrade order

1. Ship verifier package supporting 1.1.0 verify (no public npm release without approval).
2. Update issuer registry + scope secret provisioning.
3. Enable issuance behind feature flag / schema gate (separate founder approval).
4. Partners pin `application_binding_ref` and supply evidence manifest on verify.
5. Migration optional for persistence indexes; commitment does not require migration 151.

## 8. Deployment / migration requirements (future activation)

- Env: issuance scope secret (per environment), not in receipt.
- No migration 151 requirement for v1.1.0 fields themselves.
- Production/Demo activation: **explicit founder gate** (same class as v151).

## 9. Founder approval gates

- Production or Demo issuance of v1.1.0 receipts
- Public `@abraxas/independent-verifier` package bump
- Scope secret rotation policy
- Production issuance smoke with live dependencies

## 10. Operational interactions (no silent conversion)

| Surface | Interaction |
| --- | --- |
| Issuance (`service.ts`) | Not modified in Build #842 |
| Pending finalization | Commitment only after durable evidence finalization (future) |
| Portable export | Manifest travels with bundle; digest checked at verify |
| Metering | Unchanged; incomplete issuance still non-billable |
| Signed status | Still required for current acceptability |
