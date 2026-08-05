# Threat Model → Code / Test Evidence Matrix

Maps threats from `docs/SECURITY_THREAT_MODEL.md` (STRIDE) to **implementation paths** and **automated tests**. Empty cells mean coverage is primarily manual review or operational.

**Legend:** ✅ = targeted automated test exists · ⚠️ = partial / integration only · — = manual / out of test scope

---

## Spoofing & session integrity

| Threat | Control / mitigation | Code | Tests |
|--------|---------------------|------|-------|
| Forged zkLogin `id_token` | Google JWKS verify (`aud`, `iss`, `sub`) | `lib/auth/verifyZkLoginIdToken.ts` | ✅ `lib/auth/verifyZkLoginIdToken.test.ts` |
| Browser session without OAuth proof | Mint requires verified `id_token` + registered identity | `app/api/auth/browser-session/route.ts` | ✅ `lib/auth/zkloginRegisterRoute.test.ts` |
| Session cookie tampering | HS256 verify + identity row check | `lib/auth/browserSession.ts` | ⚠️ route tests in `lib/partner/partnerFlowRoutes.test.ts` |
| Partner API key forgery | `abx_*` key hash lookup, scoped partner | `lib/verification/v1PartnerAuth.ts`, `lib/partner/partnerAuth.ts` | ✅ `lib/partner/partnerAuth.test.ts` |
| Client-forged `flow_trace_id` | Server-derived trace; mismatch → 400 + `rejected` audit | `lib/partner/partnerFlowAudit.ts` | ✅ `lib/partner/partnerFlowAudit.test.ts`, `lib/partner/partnerFlowRoutes.test.ts` |

---

## Tampering & integrity

| Threat | Control / mitigation | Code | Tests |
|--------|---------------------|------|-------|
| Receipt payload tampering | Ed25519 signature over canonical JSON | `lib/decisionReceipts/signing.ts`, `canonical.ts` | ✅ `lib/decisionReceipts/decisionReceipts.test.ts` |
| Trust Decision manipulation | Fail-closed evaluator | `lib/decisionReceipts/trustEvaluation.ts` | ✅ `lib/decisionReceipts/trustEvaluation.test.ts` |
| Audit metadata PII injection | Write-time allowlist + sanitization | `lib/partner/partnerFlowAuditContract.ts` | ✅ `lib/partner/partnerFlowAuditContract.test.ts` |
| Unsafe idempotency key in audit | Only `pf_vr:*` keys persisted | `safeIdempotencyKeyForAudit()` | ✅ `lib/partner/partnerFlowAuditContract.test.ts` |
| Duplicate session receipts | Server-derived idempotency keys | `lib/partner/partnerFlowIdempotency.ts`, `relyingPartyFlow.ts` | ✅ `lib/partner/partnerFlowIdempotency.test.ts`, `.integration.test.ts` |
| Duplicate refresh replacement | Per-cycle `issuance_operation` + receipt ID linkage | `lib/partner/partnerFlowTraceAudit.ts` | ✅ `lib/partner/partnerFlowTraceAudit.test.ts` |

---

## Repudiation

| Threat | Control / mitigation | Code | Tests |
|--------|---------------------|------|-------|
| Partner flow steps not auditable | Required audit on success paths | `lib/partner/partnerFlowAudit.ts`, route handlers | ✅ `lib/partner/partnerFlowAuditEmission.test.ts` |
| Trace correlation gaps | `flow_trace_id` on all partner_flow events | `partnerFlowAudit.ts`, migration 054 index | ✅ `lib/partner/partnerFlowTraceAudit.test.ts`, `migration054AuditIndex.test.ts` |
| Idempotent replay vs fresh issue | Distinct audit actions | `receipt_issued` vs `idempotent_replay` | ✅ `lib/partner/partnerFlowAudit.test.ts` |

---

## Information disclosure

| Threat | Control / mitigation | Code | Tests |
|--------|---------------------|------|-------|
| PII in public receipt | Public view filter | `lib/decisionReceipts/views.ts` | ✅ `lib/decisionReceipts/decisionReceipts.test.ts` |
| PII in audit metadata | Forbidden keys + value patterns | `partnerFlowAuditContract.ts` | ✅ `lib/partner/partnerFlowAuditContract.test.ts`, `partnerFlowTraceAudit.test.ts` |
| Credential / status enumeration | **Known gap** — some routes query by address | `app/api/credentials/me/route.ts`, `app/api/identity/status/route.ts` | — see `BETA_LIMITATIONS_AND_SCOPE.md` |
| Open redirect to partner | Return URL allowlist | `lib/connect/returnUrlAllowlist.ts` | ✅ `lib/connect/returnUrlAllowlist.test.ts` |

---

## Denial of service

| Threat | Control / mitigation | Code | Tests |
|--------|---------------------|------|-------|
| Audit persistence failure blocks flow | Required audit throws 503 on success paths | `auditPartnerFlowStepRequired` | ✅ `lib/partner/partnerFlowAudit.test.ts` |
| Idempotency conflict storms | 409 + stable error code | Partner-flow routes | ⚠️ `lib/partner/partnerFlowRoutes.test.ts` |

---

## Elevation of privilege

| Threat | Control / mitigation | Code | Tests |
|--------|---------------------|------|-------|
| Partner A accesses Partner B data | API key → `partner_id` scope | `lib/verification/v1PartnerAuth.ts` | ✅ `lib/verify/permissions.test.ts` |
| Holder escalates to admin | Separate admin session model | `lib/adminAuth.ts` | ✅ `lib/adminAuth.test.ts` |
| Unauthenticated IDV sync | **Known gap** — public sync endpoint | `app/api/idv/sync-decision/route.ts` | — see limitations |
| Service role from client | Key server-only | `lib/supabase/admin.ts` | — deployment review |

---

## Partner Flow end-to-end evidence

| Scenario | Code path | Tests |
|----------|-----------|-------|
| Evaluate enter + receipt audit order | `evaluate/route.ts` | ✅ `lib/partner/partnerFlowAuditEmission.test.ts` |
| Complete receipt before step | `complete/route.ts` | ✅ `lib/partner/partnerFlowAuditEmission.test.ts` |
| Idempotent replay (no duplicate receipt event) | `relyingPartyFlow.ts` | ✅ `lib/partner/partnerFlowIdempotency.integration.test.ts` |
| Multi-attempt causal ordering | `partnerFlowTraceAudit.ts` | ✅ `lib/partner/partnerFlowTraceAudit.test.ts` |
| Refresh replacement on same trace | `refresh/route.ts`, trace analyzer | ✅ `lib/partner/partnerFlowTraceAudit.test.ts` |
| Public receipt validation | `verifyPartnerFlowReceipt.ts` | ✅ `lib/partner/verifyPartnerFlowReceipt.test.ts` |

---

## Operational / deployment evidence

| Check | Command / doc |
|-------|----------------|
| TypeScript compile | `npx tsc --noEmit` |
| Full unit suite | `npm test` |
| Integration preflight | `npm run integration:preflight` — `docs/INTEGRATION_PREFLIGHT.md` |
| Production trace audit | `npm run audit:partner-flow-trace -- ft_vr_<id>` |
| Receipt fixture gate | `npm run gate:verify-receipt-fixture` |
| Beta gate preflight | `BETA_GATE_BASE_URL=... npm run gate:preflight` |
| Production readiness audit | `AUDIT_BASE_URL=... npm run audit:production` |

See [REPRO_COMMANDS.md](./REPRO_COMMANDS.md) for full copy-paste blocks.
