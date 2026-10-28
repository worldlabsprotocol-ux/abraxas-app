# Build 885 — Institutional authority and independent enforcement

## Objective

Advance Build 883’s synthetic mandate gate to **cryptographically verifiable, issuer-backed mandates** and prove **independent relying-party enforcement** without Abraxas hosted UI or database trust.

## Reused components

| Area | Location |
|------|----------|
| Mandate scope gate | `lib/institutional/transactionMandateEnforcement.ts` |
| Signed mandate (new) | `lib/institutional/mandate/*` |
| Issuer authority | `lib/persistence/boundary/issuerAuthority/*` |
| Independent verifier | `packages/abraxas-independent-verifier` |
| External partner pattern | `examples/external-node-partner/` |
| Security drills | `scripts/build-874/run-security-operations-drills.ts` |
| Production evidence | `scripts/build-883/continuous-trust-evidence.ts`, Playwright `build-883-production-evidence.spec.ts` |

## Controlled issuer fixture

Label: `abraxas_controlled_test_mandate_issuer_not_live_institution`

Keys with `reason_class: institutional_mandate_issuer` may sign mandates. Receipt-only keys must not.

## Verification commands

```bash
npm run test:build-885-institutional-authority
npm run build885:institutional-authority-evidence
```

## Trust properties added

1. Mandate payload canonical hash + Ed25519 signature verified against signed issuer authority statement.
2. Mandate issuer capability separated from receipt signing (`reason_class`).
3. Relying-party enforcement combines verified mandate, transaction scope, and optional independent receipt binding (policy version + evidence commitment to `mandate_id`).
4. Adversarial catalog for invalid issuer, actor, transaction, revocation, expiration, tampering, and unverified receipt.

## Not claimed

- Live external institution mandate issuance
- Full Production wallet journey completion
- Independent third-party security audit
- 9/10 scorecard increase from tests alone

## Production wallet gate (Track D)

Preserve Build 883 browser/evidence workflow. Manual checkpoint where live wallet or institution credentials are required.
