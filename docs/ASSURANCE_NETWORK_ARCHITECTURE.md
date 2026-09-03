# Abraxas Assurance Network — Architecture

**Status:** Foundation (types, guards, homepage narrative). Not production certification.

**Product direction:** A privacy-preserving assurance network that lets people prove eligibility once and present policy-specific proof wherever it is accepted.

---

## 1. Architecture assessment

### Current state

Abraxas already implements substantial building blocks:

| Layer | Location | Role |
|-------|----------|------|
| Authentication | `lib/auth/*`, zkLogin OAuth | Account control — **not** age proof |
| Claims store | `lib/credentials/claimSchema.ts` | L1–L4 assurance on persisted claims |
| Policy evaluation | `lib/policy/evaluatePolicy.ts` | Server-side partner policy against active claims |
| Decision receipts | `lib/decisionReceipts/*` | Signed, partner-bound transaction outcomes |
| Partner verify flow | `lib/partner/*`, `components/partner/*` | Good Trouble Wix pilot and partner journeys |
| Trust / JWKS | `lib/decisionReceipts/trustEvaluation.ts` | Issuer validation, audience checks, expiry |
| Sandbox fixtures | `lib/credentials/sandboxClaims.ts` | Non-production evidence for pilots |

### Gap this foundation closes

The codebase previously mixed **authentication**, **claim assurance (L1–L4)**, and **product positioning** without a first-class **eligibility assurance ladder** or **reusable credential** model visible to merchants and integrators.

New modules in `lib/assurance/` introduce:

- `EligibilityAssuranceLevel` — `SELF_ATTESTED` → `AGE_ESTIMATED` → `AGE_VERIFIED` (evidence quality only)
- `TransactionRequirement` — `NO_ADDITIONAL_CHECK` | `STEP_UP_REQUIRED` | `TRANSACTION_ID_REQUIRED` (transaction obligations, independent)
- `ReusableEligibilityCredential` — minimal, merchant-safe fields only
- `assuranceGuards.ts` — fail-closed rules (zkLogin cap, silent-upgrade block, replay, audience)
- `eligibilityPolicyCatalog.ts` — example policy IDs for architecture (not legal approval)
- `providerAdapter.ts` — interface boundary for future IDV vendors (no live wiring)

Homepage narrative lives in `lib/home/assuranceNetworkCopy.ts` and `components/home/HomeAssuranceNetwork.tsx`.

### Lifecycle (target)

```
First verification:
  Authenticate → obtain authoritative evidence → issue reusable Abraxas credential

Later merchant visit:
  Authenticate → request consent → evaluate partner policy → issue transaction-specific pass/fail receipt

Higher-risk transaction:
  Recognize existing credential → step-up verification when required → new transaction receipt
```

Existing partner flows continue to use `evaluatePolicy` + decision receipts. The assurance module provides typed vocabulary and guards that production wiring should adopt incrementally.

---

## 2. Threat model and trust boundaries

### Trust boundaries

| Boundary | Authoritative side | Untrusted side |
|----------|-------------------|----------------|
| Policy evaluation | Abraxas server (`evaluatePolicy`) | Browser, partner client |
| Receipt validity | Issuer signature + JWKS + DB status | Partner callback payload alone |
| Age / eligibility evidence | Approved provider pipelines | zkLogin OAuth token, wallet address |
| Merchant decision | Partner systems | Abraxas receipt (input only) |
| PII | Encrypted store, minimal audit | Merchant-facing receipts and callbacks |

### Key threats and mitigations

| Threat | Mitigation (existing or planned) |
|--------|----------------------------------|
| zkLogin mistaken for age proof | `maxEligibilityFromAuthentication` caps at `SELF_ATTESTED`; homepage disclaimer |
| Silent assurance upgrade | `assertAssuranceNotSilentlyUpgraded` |
| Transaction obligation mistaken for evidence | Separate `TransactionRequirement` dimension; `resolveCredentialAssurance` never upgrades |
| Expired / revoked credential reuse | `credentialStatusBlocksEvaluation`; claim status registry |
| Receipt replay | One-time redemption; `assertFreshReceiptIssue` |
| Wrong partner receives receipt | `assertReceiptAudienceMatches`; `evaluatePublicReceiptTrust` |
| Policy version drift | Immutable `rules_json`; `assertPolicyVersionMatches` |
| PII leakage to merchants | `assertMerchantSafeCredentialView`; `sanitizePartnerPayload` |
| Sandbox evidence in production | `isSandboxClaim` + `policySandboxOnly` gate in `evaluatePolicy` |
| OAuth / callback hijack | PKCE, state/nonce lifecycle, callback allowlists (partner flow) |

### What Abraxas does **not** claim

- Regulatory approval or legal compliance by default
- Elimination of point-of-sale, pickup, or delivery ID checks
- That Google sign-in proves age
- Fraud elimination or guaranteed underage prevention

---

## 3. Assurance and credential domain model

### Two independent dimensions

**Eligibility assurance** (`lib/assurance/eligibilityAssurance.ts`) measures evidence quality:

| Level | Meaning |
|-------|---------|
| `SELF_ATTESTED` | Person asserts requirement; maps to claim L1 |
| `AGE_ESTIMATED` | Vendor age-confidence; maps to L2 |
| `AGE_VERIFIED` | Authoritative ID + optional liveness; maps to L3/L4 |

**Transaction requirement** (`lib/assurance/transactionRequirement.ts`) describes transaction-time obligations:

| Requirement | Meaning |
|-------------|---------|
| `NO_ADDITIONAL_CHECK` | No extra transaction-time step beyond the Abraxas receipt |
| `STEP_UP_REQUIRED` | Stronger or renewed verification may be required |
| `TRANSACTION_ID_REQUIRED` | Merchant must still conduct legally required ID check at transaction time |

A credential carries its **actual assurance level**. A partner policy declares **both** `minimum_assurance` and `transaction_requirement`. A person may hold `AGE_VERIFIED` assurance while the policy still returns `TRANSACTION_ID_REQUIRED` — the transaction obligation does not raise or substitute for credential assurance.

**Distinct from** legacy `AssuranceLevel` (L1–L4) on `CredentialClaimRecord`. Use `mapClaimAssuranceToEligibility()` when bridging.

### Reusable credential

`ReusableEligibilityCredential` (`lib/assurance/reusableCredential.ts`):

- `credential_id`, `subject_reference`, `issuer_id`
- `assurance_level`, `claim_type`, `claim_value`
- `issued_at`, `expires_at`, `evidence_classification`
- `status`, `revocation_reference`, `signature`

**Excluded from merchant view:** DOB, document images, document numbers, legal name, address, email, phone, wallet addresses, OAuth subjects.

### Transaction receipt (existing)

Partner-bound decision receipts remain the transaction artifact:

- Signed, issuer-bound, audience/partner-bound
- Policy ID and version bound
- Flow/decision bound, short-lived
- Pass/fail + assurance metadata only

See `lib/decisionReceipts/canonical.ts` and `types.ts`.

---

## 4. Merchant integration model

1. **Register partner** — partner ID, callback allowlist, authorized policies.
2. **Publish policy** — `policy_id`, `policy_version`, `minimum_assurance`, `transaction_requirement`, `required_claims`, sandbox flag.
3. **Customer journey** — partner-initiated verify URL → authenticate → consent → evaluation.
4. **Receive receipt** — signed JWT or API payload with `decision_result`, `assurance_level`, `transaction_requirement`, expiry.
5. **Verify independently** — JWKS, audience, policy version, nonce/flow binding.
6. **Merchant decision** — partner applies receipt as one input; retains legal ID obligations where required.

For policies with `transaction_requirement: TRANSACTION_ID_REQUIRED`, integration docs must state that Abraxas output is **pre-verification** only and does not replace merchant-side ID checks.

---

## 5. Provider adapter interface

`EligibilityEvidenceProviderAdapter` (`lib/assurance/providerAdapter.ts`):

```typescript
interface EligibilityEvidenceProviderAdapter {
  readonly provider_id: string;
  readonly supported_assurance_levels: EligibilityAssuranceLevel[];
  startEvidenceSession(request: ProviderEvidenceRequest): Promise<{ redirect_url?: string; session_id: string }>;
  pollEvidenceSession(session_id: string): Promise<{ status: ProviderSessionStatus; result?: ProviderEvidenceResult }>;
  cancelEvidenceSession(session_id: string): Promise<void>;
}
```

**Not implemented in this change:** live Veriff, Yoti, or other vendor connections. Adapters must emit `evidence_classification` and `assurance_level` from vendor truth — never upgrade zkLogin to `AGE_VERIFIED`.

---

## 6. Example policies (architecture only)

Catalog in `lib/assurance/eligibilityPolicyCatalog.ts`. These IDs illustrate policy shape; they are **not** claims of legal approval:

- `good-trouble-cbd-v1`, `good-trouble-hemp-21-v1`
- `missouri-cannabis-precheck-v1`, `tobacco-remote-sale-21-v1`
- `event-entry-18-v1`, `event-entry-21-v1`
- `account-humanity-v1`, `reusable-human-assurance-v1`

Production Good Trouble continues on `good-trouble-retail-v1` sandbox policy — unchanged by this foundation.

---

## 7. Production-readiness checklist

| Item | Status |
|------|--------|
| Eligibility assurance types | Done (this PR) |
| Fail-closed guards + unit tests | Done (this PR) |
| Homepage product narrative | Done (this PR) |
| Wire assurance levels into `evaluatePolicy` | Not started |
| Persist reusable credentials table | Not started |
| Production IDV provider adapter | Not started |
| Step-up verification orchestration | Not started |
| Credential revocation API + merchant status | Partial (claims registry exists) |
| Receipt one-time redemption enforcement (prod) | Partial (sandbox paths exist) |
| JWKS rotation runbook | Documented elsewhere |
| Legal review per vertical policy | Required before production claims |
| Homepage baseline refresh (`[ui-change]`) | Required on merge |

---

## 8. Legal and product assumptions (open)

- Example policies require counsel review before production marketing or enforcement.
- Cannabis, tobacco, and alcohol workflows default to **pre-verification** unless a specific policy and jurisdiction review permit stronger claims.
- Merchants remain responsible for transaction-time ID checks where law requires them.
- Abraxas language uses "designed to support" and "configurable for" — not certification.

---

## 9. Related documentation

- `docs/TRUST_MODEL_V1.md` — trust layer overview
- `docs/SECURITY_THREAT_MODEL.md` — platform threat model
- `docs/PARTNER_FLOW_INTEGRATION.md` — partner integration
- `docs/GOOD_TROUBLE_WIX_SANDBOX.md` — current pilot
- `docs/commercial/AGE_GATED_COMMERCE_COUNSEL_BRIEF_v1.md` — counsel context
