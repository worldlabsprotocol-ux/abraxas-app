# Build #548 — Consumption semantics audit

## Pre-548 state (Build #547)

- Single-use keyed primarily by `receipt_id` (filesystem/memory).
- `request_id` affected consumption_id hashing but not replay uniqueness after #548 scope fix.
- Filesystem: wx marker then audit append (marker-without-audit fail-closed in #547 hardening).

## Authorization vs consumption vs audit

| Layer | Source | Grant dependency |
|-------|--------|------------------|
| Authorization | Build #546 `verifyReceiptIndependently` | Signature, issuer, policy, audience, expiry, revocation |
| Durable consumption | Replay key uniqueness | Postgres: same transaction as audit |
| Audit evidence | `receipt_consumption_audit` row | Required for `durable_audit_logged` and grant on postgres adapter |

## Canonical replay key (Build #548)

`single_use_partner_policy_receipt_v1` → SHA-256 over scope, partner, policy, receipt.

Not included: `request_id`, nonce (receipt ID is the presentation instance), session cookies, Abraxas internal IDs.

## Expiry / freshness

Enforced only in verifier (`currently_authorizable`); consumption store does not extend receipt validity.
