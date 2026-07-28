# Application Wiring Audit — Admin Identity Review

Production schema verified (2026-07-28). This document covers **application-layer** wiring.

## Production health check (live)

| Check | Result |
|-------|--------|
| `GET https://abraxasworld.xyz/admin/identity` | **200** — page reachable |
| `GET /api/admin/identity/queue` (no auth) | **401** — auth enforced |
| `GET /api/idv/independent/status` | **200** — engine live, Supabase + signing key configured |
| Pending review count (at audit time) | 2 |

## Environment variables (Vercel)

| Variable | Used by | Required for |
|----------|---------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | All IDV routes | DB reads/writes |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin + capture APIs | Bypass RLS |
| `ADMIN_PIN` or `NEXT_PUBLIC_ADMIN_PIN` | Admin API + UI | Reviewer auth (pilot) |
| `ABRAXAS_ADMIN_EMAILS` | `/api/admin/access` | Email-based admin nav + layout |
| `ABRAXAS_SIGNING_KEY` | Credential issuance on Approve | L2 credential JWT |
| `ABRAXAS_BROWSER_SESSION_SECRET` | Capture + my-verification | User session scoping |

## API routes — identity review

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/admin/access` | Session or PIN cookie | Nav + layout gate |
| POST | `/api/admin/session` | PIN body | Set httpOnly admin cookie |
| GET | `/api/admin/identity/queue` | `checkAdminAccess` | Pending queue |
| POST | `/api/admin/identity/approve` | `checkAdminAccess` | Approve / reject / resubmit |
| GET | `/api/admin/identity/document-url` | `checkAdminAccess` | Signed previews |
| POST | `/api/identity/documents/capture` | Browser session | User submit |
| GET | `/api/identity/status` | Public (sui/email param) | Passport status |
| GET | `/api/identity/my-verification` | Browser session | **Own** submission only |

## End-to-end flows

### Submit → queue
1. User POSTs capture → engine runs → `identity_biometric_assessments` upsert
2. If not `reject` → `passport_documents` ×2 inserted (`submitted`)
3. Admin queue queries `status IN (submitted, under_review)`

### Approve
1. `issueManualIdentityCredential` → `identity_verifications` + `abraxas_credentials`
2. `passport_documents` → `accepted`, `reviewed_by`, `reviewer_note`
3. `identity_biometric_assessments` → `reviewer_decision` (engine `decision` unchanged)
4. `identity_review_audit_log` → immutable insert

### Request resubmission (verified working in production)
1. `passport_documents` → `resubmission_requested`
2. `identity_verifications` → `requires_resubmission`
3. User sees **My Verification** panel with reviewer note + upload CTA

## User vs admin separation

| Role | Sees | Auth |
|------|------|------|
| User | `/passport` + `GET /api/identity/my-verification` (own wallet only) | Browser session |
| Admin | `/admin/*` + admin APIs | `ABRAXAS_ADMIN_EMAILS` or PIN cookie |

Set in Vercel:
```
ABRAXAS_ADMIN_EMAILS=you@yourdomain.com,reviewer@yourdomain.com
```

## Manual E2E checklist

- [ ] Submit valid identity → appears in `/admin/identity`
- [ ] Approve → `passport_documents.accepted`, audit log row, credential on `/passport`
- [ ] Reject → `rejected`, user sees declined state
- [ ] Resubmit → user sees resubmission panel, can upload again
- [ ] Non-admin visiting `/admin/identity` → blocked at layout (PIN or sign-in required)

## Tooling

```bash
npm run identity:verify-schema      # column probe against live Supabase
npm run identity:seed-review-queue  # 5 pending + 2 approved + 2 rejected + 1 resubmit
```
