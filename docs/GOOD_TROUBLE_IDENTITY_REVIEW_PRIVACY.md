# Good Trouble Identity Review & Privacy-Safe Evidence Retention

## Root cause: missing Good Trouble records in admin queue

Good Trouble retail policy applies strict biometric thresholds (`face_min: 0.90`, `fraud_risk_max: 0.15`). The capture route returned **422** on engine `reject` **before** inserting `passport_documents` rows. The admin queue reads only `passport_documents`, so soft engine rejects never appeared.

Secondary drift: `getHolderCredentialStatus()` returned `pending_review` from `identity_verifications.status` without checking for actual queue rows.

## Fixes in this branch

1. **Partner human-review escalation** (`lib/idv/partnerCaptureReviewRouting.ts`): age-gated partner flows (`minimum_age >= 21`) escalate soft engine rejects to `human_review` and queue normally. Hard rejects (missing face, multiple faces) still block.
2. **`identity_review_sessions` table** (migration 079): stores non-PII partner context (`partner_id`, `policy_id`, `verification_request_id`, `review_status`, purge metadata).
3. **Privacy-safe queue list** (`lib/admin/identityReviewQueueResponse.ts`): list endpoints omit legal name, email, and images unless `detail=true` (protected review detail).
4. **Raw evidence purge** (`lib/idv/rawEvidencePurge.ts`): operator-controlled purge of storage blobs and document fields; preserves audit log + credentials.

## Lifecycle state model

| State | `identity_review_sessions.review_status` | `passport_documents.status` |
|-------|------------------------------------------|-----------------------------|
| Pending | `pending` | `under_review` |
| Approved | `approved` | `accepted` |
| Rejected | `rejected` | `rejected` |
| Expired (resubmit) | `expired` | `resubmission_requested` |

Duplicate active pending reviews per partner flow are blocked by partial unique indexes.

## Data classification

| Category | Examples | Retention |
|----------|----------|-----------|
| A. Temporary raw evidence | DOB, ID/selfie images, legal name, storage paths | Purge after `RAW_IDENTITY_EVIDENCE_RETENTION_DAYS` (operator-configured) |
| B. Minimized audit record | `identity_review_audit_log`, `identity_review_sessions`, `age_evidence_records` metadata | Retained (immutable audit) |
| C. Reusable credential | `product_eligibility` / `over_21` claims in `abraxas_credentials` | Retained until expiry/revocation |

Partners receive only policy decision receipts — never DOB, images, or document numbers.

## Configurable retention boundary

- Env: `RAW_IDENTITY_EVIDENCE_RETENTION_DAYS` (server-only, **not** `NEXT_PUBLIC_`)
- If unset or invalid: purge eligibility scan **fails safely** — no silent default
- **Operator/counsel must approve** production retention value before enabling automated purge

## Repeat-visit behavior

After raw evidence purge:

- Existing valid `product_eligibility` credential is re-evaluated
- Good Trouble receives a **new** partner-bound receipt (fresh receipt ID)
- No re-collection while credential remains valid
- Expired/revoked credentials fail closed
- Partner mismatch on receipt validation is rejected

## Migration & deployment order

1. Apply `079_identity_review_sessions.sql` on staging Supabase (after 078 if age evidence ledger is used)
2. Verify: `SELECT to_regclass('public.identity_review_sessions');`
3. Set `RAW_IDENTITY_EVIDENCE_RETENTION_DAYS` per operator/counsel approval
4. Deploy application revision
5. Repeat for production before enabling production purge automation

Migration is **additive only** — safe before app deploy; older app revisions continue working without session rows.

## Manual authenticated E2E (operator)

1. Good Trouble Wix → `/partner/verify` with `good-trouble-cannabis` / `good-trouble-retail-v1`
2. Google sign-in (account control only — not age proof)
3. Wallet bind → `/partner/continue` → capture ID + selfie + DOB
4. Confirm row in `/admin/identity?status=pending` with partner/policy visible
5. Admin approve with reviewer reason + document DOB
6. Holder receives credential → fresh receipt → Wix callback validates server-side
7. After retention period (or manual purge): repeat visit issues new receipt without re-collection

## Operator/counsel decisions still required

- Approved `RAW_IDENTITY_EVIDENCE_RETENTION_DAYS` for each environment
- Whether automated batch purge cron is enabled (API route exists; cron not wired)
- Legal basis for retention period by jurisdiction
- Production promotion of Good Trouble sandbox policy overlay

## Remaining blockers

- Automated purge cron not scheduled (operator API only)
- Full authenticated staging E2E requires dedicated test identity + Google OAuth (manual)
- Migration 079 not yet applied to shared staging Supabase
