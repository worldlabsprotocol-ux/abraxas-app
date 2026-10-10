# Build #503 — Policy predicate audit

## Finding (P0)

**`cielo-verified-guest-v1` is not equivalent to Launchpad pack `age_21_retail`.**

| Dimension | cielo-verified-guest-v1 | age_21_retail |
|-----------|-------------------------|---------------|
| Policy id | `cielo-verified-guest-v1` (immutable v1) | Per-tenant pinned id |
| Minimum age | **None** | 21 |
| Required claims | `wallet_binding_confirmed` L3, 720h | `identity_verified` L2 |
| Account / profile | Required (adapter) | Account via pack rules |
| Consent | Required | Required |
| Identity | Optional | Required for age |
| Disclosed result | `verified_guest_pilot_pass` | `age_eligible_21` |
| Receipt path | `issueReceiptForDecision` | Same |

**Build #503 fix:** Holder brief, merchant profile, and flagship copy now describe **v1 predicates** (`cieloVerifiedGuestPolicyContract.ts`). No silent mutation of v1.

## Future 21+ Cielo

Operator must publish a **new policy version** via policy change control and Launchpad — not relabel v1.

## Code references

- Predicates: `lib/cielo/cieloVerifiedGuestPolicyContract.ts`
- Tests: `cieloVerifiedGuestPolicyContract.test.ts`
- Receipt trust on submit: `lib/cielo/cieloReceiptTrust.ts`
