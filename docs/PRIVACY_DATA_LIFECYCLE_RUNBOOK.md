# Privacy & Data Lifecycle Operator Runbook

Technical infrastructure for holder export and deletion **requests**. This is not a legal compliance program and does not perform automatic destructive deletion.

## Prerequisites

1. Apply `supabase/migrations/060_privacy_request_ledger.sql` manually in the Supabase SQL editor when ready.
2. Confirm `ABRAXAS_BROWSER_SESSION_SECRET` (or `ABRAXAS_SIGNING_KEY`) is set for holder session auth.
3. Confirm admin access via `ABRAXAS_ADMIN_EMAILS` and/or `ADMIN_PIN`.

## Data inventory (what Abraxas holds)

| Category | Primary stores | Partner exposure |
|----------|----------------|------------------|
| Identity verification | `identity_verifications`, `identity_verification_events`, `identity_review_audit_log` | Proofs/claims only — not raw ID |
| Documents & biometrics | `passport_documents`, `identity_biometric_assessments`, Storage bucket `passport-documents` | Never raw files |
| Credentials & claims | `abraxas_credentials`, `credential_claims`, `credential_status_events` | Policy-scoped claim verification |
| Partner consent & decisions | `consent_receipts`, `verification_requests`, `verification_decisions`, `decision_receipts` | Partner-scoped; immutable audit |
| Wallet bindings | `wallet_bindings`, `wallet_binding_challenges` | Binding refs in receipts |
| Audit & metering | `audit_events`, partner-flow metering tables | Not shared with partners |

### Storage paths (`passport-documents` bucket)

- Current: `identity/{emailSafe}/{sessionId}/id_front.{ext}`, `selfie.{ext}`
- Legacy: `{stampId}/{emailSafe}/{timestamp}_{filename}`

**No automated blob deletion exists in this release.**

## Holder workflow

1. Holder signs in to Passport and opens **Your data and privacy**.
2. Holder submits **data export** or **account/data deletion** request.
3. Request is recorded in `privacy_requests` with status `requested`.
4. Holder sees status labels only — no internal IDs, storage paths, or admin notes.

## Admin workflow

Admin queue: `/admin/privacy`

| Action | Effect |
|--------|--------|
| `start_review` | Status → `under_review` |
| `approve_export` | Status → `approved` (operator fulfills export manually) |
| `approve_deletion` | Status → `approved` then `access_revoked_pending_purge`; revokes claims + identity status |
| `legal_hold` | Status → `legal_hold` (cannot delete yet) |
| `complete` | Status → `completed` |
| `deny` | Status → `denied` |

### Deletion approval (safe path)

When approving deletion:

1. **Does:** revoke active credential claims, set `identity_verifications.status = revoked`.
2. **Does not:** delete storage blobs, audit rows, decision receipts, metering, or legal/security evidence.
3. **Status:** `access_revoked_pending_purge` — physical deletion requires separate retention/purge implementation.

### Export fulfillment

- Exports are **admin-fulfilled** in this release.
- Do not place export packages on public URLs.
- Do not include raw ID/selfie files unless explicitly required and delivered via authenticated short-lived access.

## Audit requirements

All privacy transitions write to:

- `privacy_request_events` (append-only ledger events)
- `audit_events` via `appendAuditEvent`

Metadata must **not** contain email, wallet addresses, document paths, JWTs, or biometrics. Use `subject_pseudonym_id` and non-PII reason codes only.

## Idempotency

- Holder create: `idempotency_key` on `privacy_requests` (unique).
- Admin actions: `idempotency_key` on `privacy_request_events` (unique per transition).

Replay of the same idempotency key returns the existing record without duplicate side effects.

## API reference

| Route | Auth | Purpose |
|-------|------|---------|
| `GET/POST /api/passport/privacy/requests` | Browser session | Holder list/create |
| `GET /api/admin/privacy/requests` | Admin | Queue list |
| `GET/POST /api/admin/privacy/requests/[requestId]` | Admin | Detail + review actions |

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Privacy center shows migration error | Apply `060_privacy_request_ledger.sql` |
| Holder 401 | Browser session cookie / zkLogin identity row |
| Admin 401 | Admin email allowlist or PIN |
| Deletion approved but partner still works | Claims revocation + receipt validity; partner flow uses live trust |

## Related docs

- `docs/PRIVACY_RETENTION_PURGE_LIMITATIONS.md` — what cannot be auto-deleted yet
