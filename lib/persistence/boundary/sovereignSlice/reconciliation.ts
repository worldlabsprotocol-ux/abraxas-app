// FILE: lib/persistence/boundary/sovereignSlice/reconciliation.ts

import { createHash } from "node:crypto";
import type { Pool } from "pg";

export type SovereignSliceReconciliation = {
  receiptCount: number;
  meteringCount: number;
  receiptIntegrityDigest: string;
  meteringIdempotencyDigest: string;
};

type ReceiptDigestRow = {
  id: string;
  payload_hash: string;
  signature: string;
  status: string;
  revoked_at: string | null;
};

type MeteringDigestRow = { idempotency_key: string; receipt_id: string | null; partner_id: string };

function digestRows(label: string, rows: unknown[]): string {
  const canonical = JSON.stringify(rows);
  return createHash("sha256").update(`${label}\n${canonical}`, "utf8").digest("hex");
}

export async function reconcileSovereignSlice(pool: Pool): Promise<SovereignSliceReconciliation> {
  const receipts = await pool.query<ReceiptDigestRow>(
    `select id, payload_hash, signature, status, revoked_at
       from public.decision_receipts
      order by id asc`,
  );
  const metering = await pool.query<MeteringDigestRow>(
    `select idempotency_key, receipt_id, partner_id
       from public.partner_metering_events
      order by idempotency_key asc`,
  );

  return {
    receiptCount: receipts.rowCount ?? receipts.rows.length,
    meteringCount: metering.rowCount ?? metering.rows.length,
    receiptIntegrityDigest: digestRows("receipts", receipts.rows),
    meteringIdempotencyDigest: digestRows("metering", metering.rows),
  };
}

export function assertReconciliationEqual(
  primary: SovereignSliceReconciliation,
  restored: SovereignSliceReconciliation,
): string[] {
  const mismatches: string[] = [];
  if (primary.receiptCount !== restored.receiptCount) {
    mismatches.push(`receipt_count:${primary.receiptCount}!=${restored.receiptCount}`);
  }
  if (primary.meteringCount !== restored.meteringCount) {
    mismatches.push(`metering_count:${primary.meteringCount}!=${restored.meteringCount}`);
  }
  if (primary.receiptIntegrityDigest !== restored.receiptIntegrityDigest) {
    mismatches.push("receipt_integrity_digest_mismatch");
  }
  if (primary.meteringIdempotencyDigest !== restored.meteringIdempotencyDigest) {
    mismatches.push("metering_idempotency_digest_mismatch");
  }
  return mismatches;
}
