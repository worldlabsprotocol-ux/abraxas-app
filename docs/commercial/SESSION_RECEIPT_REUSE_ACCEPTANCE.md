# Session receipt reuse — live metering acceptance

**Founder decision:** Preserve session-scoped receipt reuse. Billing remains disabled.

## Current sandbox receipt (reuse baseline)

- Receipt: `dr_CyEfbNw7tTqsZNIh`
- Valid until: **2026-10-24 08:08 Pacific** (natural session expiry)
- A genuine holder run that reuses this receipt must **not** add a `partner_flow_receipt_issued` metering row.

## After natural expiry — one fresh authorized run

Use the existing Integration Studio sandbox application (wallet-control). Complete genuine Phantom signing and sharing consent.

### Pass criteria when a **new** approved receipt is issued

1. Distinct `dr_*` receipt id (not `dr_CyEfbNw7tTqsZNIh` unless legitimately superseded by refresh semantics).
2. Valid issuer signature on public verify.
3. Approved decision.
4. Current sandbox validity at completion time.
5. Completed handoff and approved callback.
6. Exactly **one** durable `partner_metering_events` row (`event_type: partner_flow_receipt_issued`, idempotency `meter:pf_receipt:{receipt_id}`).
7. Correct tenant, policy, receipt, and idempotency attribution.
8. No duplicate metering on callback refresh or exact replay (`receipt_outcome: replayed`).

### If the server still reuses a valid decision

Report **`receipt_outcome: reused`** in audit/Launchpad activity — do not force issuance for accounting.

### If issuance succeeds but metering row is missing

Treat as a persistence defect in `maybeRecordPartnerFlowReceiptMetering` / Demo DB — do not backfill historical rows or activate billing.

## Operator evidence (product)

| `receipt_outcome` | Meaning |
|-------------------|---------|
| `issued` | New signed decision |
| `reused` | Active session decision satisfied a new request |
| `replayed` | Exact operation returned prior outcome |

Legacy `replay_status` remains for metering gates: only `issued` is billable.
