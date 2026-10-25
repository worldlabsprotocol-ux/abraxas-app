# Sandbox test cases (design partner)

Run in **sandbox** with your own `partner_id` / `policy_id`. Synthetic cases below are automatable in CI without a live holder.

## Automated (repo — measured)

| Case | Expected | Evidence |
|------|----------|----------|
| Valid synthetic receipt + status | Verify passes; scoped permit when policy matches | `examples/integration-first-relying-party/integration-first.test.ts` |
| Wrong partner/policy | `audience_mismatch` → deny / fail | same |
| Revoked status | Not currently acceptable → deny | same |
| Stale status vs checkpoint | `status_version_rollback_rejected` → no permit | `trustContinuity.adversarial.test.ts` |
| Untrusted bundled anchor | Pin mismatch → indeterminate | `portable-relying-party.test.ts` |
| Authentic expired receipt | **deny** (not indeterminate) | `standalonePortableOutcome.test.ts` |

Command:

```bash
npm run test:build-828-design-partner-readiness
```

## Live sandbox (partner-executed — targets)

| Case | Setup | Expected enforcement |
|------|--------|----------------------|
| Happy path issuance | Holder completes wallet sandbox flow | Callback verify OK; portable verify `permit` or policy-specific deny |
| Expired receipt | Use receipt past validity window | `deny`, `cryptographically_authentic: true` |
| Wrong callback tenant | Tamper `partner_id` in client only | Server verify fails closed |
| Portable export down | Block export URL | `indeterminate`, retry guidance |
| Restart after verify | Stop process, rerun with checkpoint file | No status rollback accepted |
| Duplicate callback | Replay same callback URL | Idempotent deny / no double grant (partner idempotency store) |

## Not claimed without external partner

- Time-to-first sandbox request in partner infrastructure
- Partner-completed 14-day pilot sign-off

Record actuals in [PILOT_ACCEPTANCE_CHECKLIST.md](./PILOT_ACCEPTANCE_CHECKLIST.md).
