# Build #547 — Live partner verification certification

Extends [Build #546](../build-546/TRUST_ARCHITECTURE_AUDIT.md) without modifying the standalone verifier.

## Certified locally

- Durable single-use consumption (`FileReceiptConsumptionStore`, atomic `wx` markers + audit JSONL)
- Concurrent replay (16–24 parallel decides → one grant)
- Process restart replay denial (new RP instance, same store directory)
- Revocation outage fail-closed with `cryptographically_authentic === true` and `currently_authorizable === false`
- Build #546 adversarial matrix (issuer, rotation, policy, audience, chain vectors)

## Blocked without authorization

- Authenticated synthetic holder journey on isolated staging
- Live public receipt fetch unless `BUILD_547_SYNTHETIC_RECEIPT_ID` points at an authorized staging receipt

## Commands

- `npm run test:build-547-live-partner`
- `npm run certify:build-547`

Report: `reports/build-547-live-partner-certification.json`
