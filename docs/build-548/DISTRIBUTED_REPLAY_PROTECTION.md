# Build #548 — Distributed replay protection

Extends Build #546 (independent verifier) and Build #547 (adversarial certification harness).

## Canonical replay key

Single-use scope **`single_use_partner_policy_receipt_v1`**:

```
replay_key = SHA256(scope + NUL + partner_id + NUL + policy_id + NUL + receipt_id)
```

- **Request ID** is audit correlation only — retries with a new `request_id` cannot obtain a second grant.
- **Audience / partner / policy** binding matches Build #546 verifier expectations before consumption.

## Transaction model

| Adapter | Assurance | Durability |
|---------|-----------|------------|
| `InMemoryReceiptConsumptionStore` | `memory_dev` | Process-local |
| `FileReceiptConsumptionStore` | `filesystem_certification` | Certification wx markers (not HA) |
| `PostgresReceiptConsumptionStore` | `postgres_distributed` | `INSERT … ON CONFLICT` + audit in **one transaction** |

PostgreSQL schema: `lib/institutionalCertification/build548/schema/receipt_consumption.sql`

Environment: `BUILD_548_PG_URL` or `INSTITUTIONAL_REPLAY_TEST_DATABASE_URL` (disposable non-Supabase).

## Supabase independence

External relying parties verify signed receipts locally (Build #546) and persist consumption on **their own** PostgreSQL — no Abraxas Supabase client or holder sessions.

## Commands

- `npm run test:build-548-distributed-replay`
- `npm run certify:build-548`

Report: `reports/build-548-distributed-replay-certification.json`
