# Build #844 — Receipt v1.1.0 authoritative issuance

**Status:** Implemented behind feature gate. **Not** activated on Demo or Production.

## Issuance gate

| Env | Default | Effect |
| --- | --- | --- |
| `DECISION_RECEIPT_ISSUANCE_SCHEMA` | `1.0.0` | `1.1.0` enables authoritative v1.1.0 signing |
| `DECISION_RECEIPT_APPLICATION_BINDING_SECRET` | unset | Required when issuing app-scoped v1.1.0 receipts |
| `DECISION_RECEIPT_EVIDENCE_BLINDING_KEY` | unset | Optional; blinds dependency ids in commitments |

Registry keys must list `"1.1.0"` in `schema_versions` before v1.1.0 issuance succeeds.

## Authoritative derivation

- **Application binding:** Resolved via `getLaunchpadApplicationForPartner` + `deriveApplicationScopeFromAuthoritativeFacts`; HMAC scope digest from env secret. Fail closed when app id is present but scope/secret is unavailable.
- **Evidence commitment:** Built from `decision_receipt_evidence_dependencies` rows at sign time; optional blinding for manifest refs. Pending staged receipts sign an empty graph until activation re-signs with finalized deps.
- **Client input:** Issuance never accepts caller-supplied binding refs, commitments, or manifests.

## Finalization (Build #839)

- Pending receipts remain non-authorizable.
- On activation, v1.1.0 receipts are re-signed with finalized evidence commitment before status becomes billable/authorizable.

## Persistence (interim)

v1.1.0 signed fields are stored in `anchor_reference` sidecar (`abraxas.receipt.v1_1.sidecar:`) until optional dedicated columns ship. External chain anchors and v1.1 sidecar are mutually exclusive (fail closed).

## Activation requirements (founder gate)

1. Merge Build #844; CI green.
2. Set issuance env on target environment (`DECISION_RECEIPT_ISSUANCE_SCHEMA=1.1.0`, binding secret, optional blinding key).
3. Extend verification key registry with `1.1.0` on active signing keys.
4. Authorized issuance smoke (app-scoped + evidence reuse + independent verify).
5. Optional: DB columns for sidecar fields (remove anchor sidecar coupling).

## Unchanged

- Production/Demo config in this build
- Migration 151 apply / billing / issuer rotation / public npm release
