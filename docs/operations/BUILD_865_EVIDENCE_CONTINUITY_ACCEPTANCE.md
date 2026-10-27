# Build #865 — Evidence continuity and acceptance

## Root cause (verified)

Demo operational validity failed closed with `evidence_dependency_store_unavailable` / `evidence_dependency_missing` immediately after genuine wallet-control issuance. Investigation on Supabase project `ocntwbxarpjeixdnzide`:

| Finding | Evidence |
| --- | --- |
| Migration **113** table absent | `to_regclass('public.decision_receipt_evidence_dependencies')` was **null** before apply |
| **service_role** lacked **SELECT** on `reusable_eligibility_derivations` | `information_schema.role_table_grants` showed no SELECT for service_role |
| Code assumed reuse on derivation lookup failure | `receiptRequiresEvidenceDependencyGraph` catch returned **true**, forcing dependency rows for every receipt |
| Evaluator queried dependency store for all receipts | Deployed `evaluateReceiptCurrentValidity` always called `getReceiptEvidenceDependencies` |

Wallet-control **primary** receipts are not reuse-derived; they rely on `receipt_claim_dependencies` and live claim evaluation. Migration-113 rows are required only when `reusable_eligibility_derivations` links a derived receipt.

## Remediation

1. **Demo database (applied):** migration 113 table + migration 154 service_role GRANTs (derivations, facts, evidence dependencies).
2. **Code (this branch):**
   - Skip migration-113 reads when no reuse derivation exists.
   - Stop treating derivation lookup errors as implicit reuse.
   - Add migration **154_evidence_continuity_service_role_grants.sql** and GRANT on **113** for new environments.
   - Document service_role expectations for Demo catalog validation.

## Acceptance (Demo, post-remediation)

```bash
export LAUNCHPAD_STAGING_URL=https://demo.abraxasworld.xyz
export LAUNCHPAD_EXPECTED_SUPABASE_REF=ocntwbxarpjeixdnzide
npm run build864:demo-institutional-receipt-acceptance
```

Observed (2026-10-27):

| Check | Result |
| --- | --- |
| `currently_acceptable` | **yes** |
| `evidence_current` | **true** |
| `cryptographically_authentic` | **true** |
| Adversarial (pin, audience, tamper) | Fail-closed |

Demo app commit remains `f6234e1c…` until Vercel custom-env promotion; **database and GRANT fixes are sufficient** for current-validity on Demo.

## Branch / PR reconciliation

- **#864** — acceptance runner (reuse for verification).
- **#863 / #862 / #861** — still open; merge sequence unchanged. Do not close until commits land on `main`.
- **#865** — evidence continuity code + migration 154 + Demo DB apply documented here.

## Next priority

Second-partner repeatability on Demo (independent app/policy, same engines) after **#863–#865** merge and Demo deploy promotion.
