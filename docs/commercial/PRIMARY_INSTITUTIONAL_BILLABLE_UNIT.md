# Primary institutional billable unit (contract draft)

**Status:** Policy documented — billing collection **not enabled** (`collection_status: not_enabled` in commercial plans).

## Unit

**One completed, approved verification** = one row in `partner_metering_events` with:

- `event_type`: `partner_flow_receipt_issued`
- First insert only (`idempotency_key`: `meter:pf_receipt:{receipt_id}`)
- `decision` gate: partner flow outcome **`approved`**
- `replay_status` gate: **`issued`** (not `idempotent_replay`)

Implementation: `maybeRecordPartnerFlowReceiptMetering` in `lib/partner/partnerMeteringHooks.ts`, invoked from partner-flow **evaluate**, **complete**, and **refresh** routes. Duplicate route calls for the same receipt collapse to a single ledger row (Postgres unique on idempotency key).

## Not billable (by design)

| Case | Ledger behavior |
|------|-----------------|
| Failed / cancelled wallet signing | No receipt → no metering hook |
| Consent declined / request expired | Complete blocked → no new receipt |
| Idempotent replay of same verification | `replay_status !== issued` → hook returns early |
| Denied / revoked decision | `decision !== approved` → hook returns early |
| Public receipt verify | Excluded from API metering hook paths |

Wallet signatures and API telemetry may still be logged for security and capacity; they are **not** the proposed institutional SKU.

## Tenant attribution

`partner_id` required on every metering insert; missing partner skips recording.

## Gaps before invoicing (known)

1. **Commercial plans** still define API-call overage separately from receipts (`partnerCommercialPlans.ts`) — reconcile pricing copy with receipt-primary SKU.
2. **Synthetic / harness activity** — not auto-excluded from `partner_metering_events`; filter at report/export time (Launchpad pilot filters partial).
3. **Billing export** — no in-repo reconciliation job; ETL from `partner_metering_events` + `partner_api_usage` required.
4. **Consent** — metering does not re-read consent cookies; billable receipt issuance on wallet-control paths is only reachable after server-side sharing consent gates on **complete**.

## Sandbox vs production

Metering rows do not encode environment; commercial reporting must join policy/application metadata or partner environment to exclude sandbox from production invoices.
