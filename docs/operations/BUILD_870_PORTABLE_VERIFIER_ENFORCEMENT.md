# Build #870 — Portable verifier enforcement integrity

## Root cause

`verifyAbraxasReceiptIndependently` recorded `statement_stale` when `statementObservedAt` exceeded the pinned anchor cache policy, but **current acceptability** (`liveOk`) did not require issuer-statement freshness. `enforcementFromVerification` then mapped `currently_acceptable: yes` to **`permit`** while `failure_codes` still contained `statement_stale`.

Fresh signed **status** evidence must not override stale **issuer authority** observation.

## Correction

1. **`verifyIndependent.ts`:** Track `issuerStatementFreshnessOk`; require it for `liveOk` / `currently_acceptable: yes`.
2. **`enforceIndependent.ts`:** Shared `enforcementFromIndependentVerification` with mandatory deny codes (`statement_stale`, `status_statement_stale`, tamper, audience, etc.).
3. **Partner Kit `standalonePortableOutcome`:** Deny when mandatory deny codes are present.
4. **Build #868 adversarial matrix:** Fail closed on stale observation (`action !== permit`).

## Tests

```bash
npm run test:build-870-verifier-enforcement
npm run test:build-868-portable-relying-party
npm run test:build-865-evidence-continuity
```

## Semantics

| Condition | `currently_acceptable` | Enforcement |
| --- | --- | --- |
| Fresh issuer observation + fresh status + live gates | `yes` | `permit` |
| `statement_stale` | not `yes` | `deny` |
| `statement_freshness_unknown` | `indeterminate` | `indeterminate` |
| Authentic but revoked/expired status | `no` | `deny` |

No new trust roots, signing schemes, or verifier protocols.
