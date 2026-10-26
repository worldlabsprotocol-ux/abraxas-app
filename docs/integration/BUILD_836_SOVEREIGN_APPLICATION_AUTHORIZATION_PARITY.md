# Build #836 — Sovereign application authorization parity

## Finding

A genuine gap existed on the **sovereign current-validity** path: `evaluateSovereignCurrentValidity` enforced partner, policy, issuer authority, and lifecycle, but did **not** enforce Launchpad **application scope** when an application context was required.

Operational `evaluateReceiptCurrentValidity` already accepted an optional `applicationId`, but only checked application **status**, not authoritative **receipt binding** in `partner_launchpad_signed_receipts`.

Signed receipt payloads still do **not** embed `application_id` (protocol unchanged). Scope is enforced from **issuer-side authoritative state** on sovereign PG (or Launchpad store), never from caller-supplied identifiers alone.

## Enforcement points

| Boundary | Mechanism |
| -------- | --------- |
| Launchpad validate API | `pgGetSignedReceiptForApplication` before trust evaluation |
| Operational validity | `evaluateOperationalApplicationScope` when `applicationId` is set |
| Sovereign validity | `evaluateApplicationScopeOnSovereignPg` when `expectedApplicationId` is set |
| Unified contract | `application_scope_satisfied`; hard deny: `application_inactive`, `application_mismatch`, `application_unbound` |
| Sovereign CI slice | `partner_launchpad_applications` + `partner_launchpad_signed_receipts` in `sovereignSlice/schema.sql` |

## Portable / independent verification

Partners verifying offline without application context continue to enforce partner/policy/receipt crypto. **Application authorization** for hosted Launchpad flows requires either issuer signed status produced with `expectedApplicationId`, or partner-side binding checks — not an unsigned `application_id` query parameter.

## CI

```bash
npm run sovereign:build-836-application-authorization-parity
```

## Limitations

- No Production migration or Demo authorization policy changes beyond fail-closed binding when `applicationId` / `expectedApplicationId` is supplied.
- Receipt schema still omits `application_id`; future protocol versions could bind scope cryptographically in the payload (compatibility review required).
