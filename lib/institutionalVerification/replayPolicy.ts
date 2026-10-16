// FILE: lib/institutionalVerification/replayPolicy.ts
// Durable single-use consumption requirements for institutional authorization.

import type { ReceiptConsumptionStore } from "@/lib/institutionalCertification/build547/receiptConsumptionStore";

export const INSTITUTIONAL_REPLAY_SEMANTICS = `
Single-use authorization binds (partner_id, policy_id, receipt_id). A durable consumption store
must survive process restarts and coordinate across instances (filesystem wx markers or postgres).
Inspection-only calls never write consumption markers. In-memory stores are rejected for
authorization unless allow_in_memory_consumption_for_tests is explicitly true (CI/fixtures only).
`.trim();

export type ConsumptionStoreRequirement =
  | { ok: true; store: ReceiptConsumptionStore }
  | { ok: false; code: "durable_store_required" };

export function requireConsumptionStoreForAuthorization(input: {
  consumption_store?: ReceiptConsumptionStore;
  /** CI/fixtures only — never in production integration paths. */
  allow_in_memory_consumption_for_tests?: boolean;
}): ConsumptionStoreRequirement {
  const store = input.consumption_store;
  if (!store) {
    return { ok: false, code: "durable_store_required" };
  }
  if (store.kind === "memory" && input.allow_in_memory_consumption_for_tests !== true) {
    return { ok: false, code: "durable_store_required" };
  }
  return { ok: true, store };
}

export function isDurableConsumptionStore(store: ReceiptConsumptionStore): boolean {
  return store.kind === "filesystem" || store.kind === "postgres";
}
