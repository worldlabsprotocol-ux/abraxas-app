// FILE: lib/persistence/boundary/verticalSlice/meteringAttribution.ts

import { buildPartnerFlowReceiptMeteringKey, PARTNER_METERING_EVENT_TYPES } from "@/lib/partner/partnerMetering";
import { assertSovereignStagingWriteAllowed } from "../isolationGuard";
import { querySovereignStagingPg } from "../sovereignStagingPg";
import type { MeteringAttributionSnapshot } from "../types";

type MeteringRow = {
  idempotency_key: string;
  partner_id: string;
  event_type: string;
  receipt_id: string | null;
};

export function meteringSnapshotFromLegacyRow(row: MeteringRow | null, idempotencyKey: string): MeteringAttributionSnapshot {
  if (!row) {
    return {
      idempotencyKey,
      partnerId: "",
      eventType: "",
      receiptId: null,
      present: false,
    };
  }
  return {
    idempotencyKey: row.idempotency_key,
    partnerId: row.partner_id,
    eventType: row.event_type,
    receiptId: row.receipt_id,
    present: true,
  };
}

export async function loadMeteringAttributionFromSovereignPg(
  idempotencyKey: string,
  env: Record<string, string | undefined> = process.env,
): Promise<MeteringAttributionSnapshot> {
  const result = await querySovereignStagingPg<MeteringRow>(
    `select idempotency_key, partner_id, event_type, receipt_id
       from public.partner_metering_events
      where idempotency_key = $1
      limit 1`,
    [idempotencyKey],
    env,
  );
  if ("error" in result) {
    return meteringSnapshotFromLegacyRow(null, idempotencyKey);
  }
  return meteringSnapshotFromLegacyRow(result.rows[0] ?? null, idempotencyKey);
}

/** Test/fixture only — never Production authority. */
export async function insertMeteringFixtureOnSovereignPg(
  input: {
    partnerId: string;
    receiptId: string;
    policyId?: string | null;
    decisionId?: string | null;
  },
  env: Record<string, string | undefined> = process.env,
): Promise<{ ok: true; duplicate: boolean } | { ok: false; error: string }> {
  assertSovereignStagingWriteAllowed(env);
  const idempotencyKey = buildPartnerFlowReceiptMeteringKey(input.receiptId);
  const result = await querySovereignStagingPg(
    `insert into public.partner_metering_events (
       partner_id, event_type, idempotency_key, receipt_id, policy_id, decision_id, occurred_at
     ) values ($1, $2, $3, $4, $5, $6, now())
     on conflict (idempotency_key) do nothing
     returning idempotency_key`,
    [
      input.partnerId,
      PARTNER_METERING_EVENT_TYPES.partnerFlowReceiptIssued,
      idempotencyKey,
      input.receiptId,
      input.policyId ?? null,
      input.decisionId ?? null,
    ],
    env,
  );
  if ("error" in result) {
    if (result.error.includes("23505") || result.error.includes("duplicate")) {
      return { ok: true, duplicate: true };
    }
    return { ok: false, error: result.error };
  }
  const inserted = result.rows.length > 0;
  return { ok: true, duplicate: !inserted };
}
