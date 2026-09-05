# Good Trouble × Abraxas Age-Verification Lifecycle Audit

Phase 1 implementation map with file/line evidence. Sandbox/pilot behavior — not legal certification.

## Partner policy evaluation

| Component | Path | Evidence |
|-----------|------|----------|
| Policy rules engine | `lib/policy/evaluatePolicy.ts` | `evaluatePolicyRules()` L151–246; `policyExplicitlyRequiresProductEligibility()` L17–22 |
| Subject evaluation | `lib/policy/evaluateSubjectPolicy.ts` | `evaluatePolicyForSubject()` L19–49; uses `resolveEffectivePolicyRules` |
| Sandbox age overlay | `lib/policy/resolveEffectivePolicyRules.ts` | GT retail v1 + `minimum_age: 21` → v2 rules for live evaluation |
| GT policy contract | `lib/policy/productionPolicyContract.ts` | v1 L126–154; v2 pending L25–49 |
| Partner flow | `lib/partner/relyingPartyFlow.ts` | `evaluatePartnerFlow()` L448–551; `issuePartnerSessionReceipt()` L201–428 |

## good-trouble-retail-v1

| Item | Path |
|------|------|
| Seed migration | `supabase/migrations/049_good_trouble_cannabis_pilot.sql` |
| v2 draft (unpublished) | `supabase/migrations/076_good_trouble_retail_product_eligibility_draft.sql` |
| Constants | `lib/goodTrouble/constants.ts` |
| Effective rules overlay | `lib/policy/resolveEffectivePolicyRules.ts` |

## Assurance / evidence

| Item | Path |
|------|------|
| Provider adapter (types) | `lib/assurance/providerAdapter.ts` |
| Age evidence service | `lib/assurance/ageEvidence.ts` |
| Age evidence table | `supabase/migrations/078_age_evidence_records.sql` |
| Auth ≠ age boundary | `lib/partner/assuranceBoundary.ts` |
| DOB eligibility math | `lib/idv/ageEligibility.ts` |
| Claim issuance | `lib/idv/buildProductEligibilityClaims.ts` |

## Manual review

| Item | Path |
|------|------|
| Review service | `lib/idv/adminReviewService.ts` L145–280 |
| Approve API | `app/api/admin/identity/approve/route.ts` |
| Operator UI | `app/admin/identity/page.tsx` |
| Audit log table | `supabase/migrations/050_identity_review_workflow.sql` |

## Credential issuance

| Item | Path |
|------|------|
| Manual issuance | `lib/idv/issueIdentityCredential.ts` |
| Capture auto-approve | `app/api/identity/documents/capture/route.ts` L263–305 |
| Product eligibility claims | `lib/idv/buildProductEligibilityClaims.ts` L13–38 |

## Decision receipts

| Item | Path |
|------|------|
| Receipt service | `lib/decisionReceipts/service.ts` |
| Partner receipt verify | `lib/partner/verifyPartnerFlowReceipt.ts` |
| Session receipt TTL | `lib/partner/sessionReceipt.ts` |

## Wix callback

| Item | Path |
|------|------|
| Result page | `examples/good-trouble-wix/pages/AgeVerificationResult.js` |
| Receipt validator | `examples/good-trouble-wix/backend/abraxasReceiptValidator.js` |
| PKCE nonce lifecycle | `examples/good-trouble-wix/backend/nonceLifecycle.js` |
| Session-only pilot flag | `examples/good-trouble-wix/public/abraxasClientConstants.js` |

## Gaps closed in this PR

1. Admin approve route/UI now pass `document_date_of_birth` + `minimum_age_gate` + required reviewer reason.
2. `PartnerContinueClient` uses `AbraxasIdentityCapture` in manual IDV mode with DOB step for GT.
3. `resolveEffectivePolicyRules` enforces `product_eligibility=over_21` for sandbox GT retail.
4. `age_evidence_records` table tracks minimum metadata for operator audit.
5. Holder UX states aligned to phase 8 copy.

## Production prerequisites (not in this PR)

- Operator publish of migration 076 draft v2 (`publish_partner_policy_draft`)
- Wix production return URL allowlist (migration 077 operator step)
- Policy `sandbox_only: false` for production-usable receipts
- Authoritative third-party IDV vendor (Veriff or equivalent) when leaving manual pilot
