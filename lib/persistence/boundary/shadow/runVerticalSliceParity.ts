// FILE: lib/persistence/boundary/shadow/runVerticalSliceParity.ts

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { buildPartnerFlowReceiptMeteringKey } from "@/lib/partner/partnerMetering";
import { evaluateShadowPersistenceIsolation } from "../isolationGuard";
import { resolvePersistenceBoundaryConfig } from "../config";
import { buildVerticalSliceParityReport } from "../invariants/compareVerticalSlice";
import type { MeteringAttributionSnapshot, VerticalSliceParityReport } from "../types";
import { loadMeteringAttributionFromSovereignPg, meteringSnapshotFromLegacyRow } from "../verticalSlice/meteringAttribution";
import {
  loadReceiptProvenanceFromSovereignPg,
  receiptProvenanceFromRecord,
} from "../verticalSlice/receiptProvenance";

export type LegacyVerticalSliceReaders = {
  loadReceipt: (receiptId: string) => Promise<DecisionReceiptRecord | null>;
  loadMetering: (idempotencyKey: string) => Promise<MeteringAttributionSnapshot>;
};

export async function runShadowVerticalSliceParity(input: {
  receiptId: string;
  legacy: LegacyVerticalSliceReaders;
  env?: Record<string, string | undefined>;
}): Promise<
  | { ok: true; report: VerticalSliceParityReport }
  | { ok: false; code: string; message: string }
> {
  const env = input.env ?? process.env;
  const boundary = resolvePersistenceBoundaryConfig(env);
  if (boundary.shadowMode !== "compare") {
    return { ok: false, code: "shadow_mode_off", message: "ABRAXAS_SHADOW_PERSISTENCE_COMPARE is not enabled" };
  }
  const isolation = evaluateShadowPersistenceIsolation(env);
  if (!isolation.ok) {
    return {
      ok: false,
      code: isolation.issues[0]?.code ?? "isolation_failed",
      message: isolation.issues[0]?.message ?? "Shadow isolation failed",
    };
  }

  const legacyRecord = await input.legacy.loadReceipt(input.receiptId);
  const idempotencyKey = buildPartnerFlowReceiptMeteringKey(input.receiptId);

  const [legacyMetering, sovereignReceipt, sovereignMetering] = await Promise.all([
    input.legacy.loadMetering(idempotencyKey),
    loadReceiptProvenanceFromSovereignPg(input.receiptId, env),
    loadMeteringAttributionFromSovereignPg(idempotencyKey, env),
  ]);

  const legacyReceipt = legacyRecord ? receiptProvenanceFromRecord(legacyRecord) : null;

  const report = buildVerticalSliceParityReport({
    legacyReceipt,
    sovereignReceipt,
    legacyMetering,
    sovereignMetering,
  });

  return { ok: true, report };
}

/** Offline-only parity when sovereign PG is intentionally unavailable. */
export function runFixtureParityFromSnapshots(input: {
  legacyReceipt: DecisionReceiptRecord;
  sovereignReceipt: DecisionReceiptRecord;
  legacyMeteringRow: Parameters<typeof meteringSnapshotFromLegacyRow>[0];
  sovereignMeteringRow: Parameters<typeof meteringSnapshotFromLegacyRow>[0];
  idempotencyKey: string;
}): VerticalSliceParityReport {
  return buildVerticalSliceParityReport({
    legacyReceipt: receiptProvenanceFromRecord(input.legacyReceipt),
    sovereignReceipt: receiptProvenanceFromRecord(input.sovereignReceipt),
    legacyMetering: meteringSnapshotFromLegacyRow(input.legacyMeteringRow, input.idempotencyKey),
    sovereignMetering: meteringSnapshotFromLegacyRow(input.sovereignMeteringRow, input.idempotencyKey),
  });
}
