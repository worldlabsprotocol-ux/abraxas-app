// FILE: lib/institutionalCertification/build548/consumptionContract.ts

import type { ReceiptConsumptionStoreKind } from "../build547/receiptConsumptionStore";

/** Separates certification fixtures from distributed replay protection. */
export type ConsumptionAssuranceLevel =
  | "memory_dev"
  | "filesystem_certification"
  | "postgres_distributed";

export function assuranceLevelForStoreKind(kind: ReceiptConsumptionStoreKind): ConsumptionAssuranceLevel {
  switch (kind) {
    case "memory":
      return "memory_dev";
    case "filesystem":
      return "filesystem_certification";
    case "postgres":
      return "postgres_distributed";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

/**
 * Consumption semantics (external RP, Supabase-independent):
 * - Authorization: Build #546 independent verifier (signature, issuer, policy, audience, expiry, revocation).
 * - Replay key: partner_id + policy_id + receipt_id under BUILD_548_REPLAY_SCOPE (request_id is audit-only).
 * - Grant requires atomic durable consumption + audit commit (Postgres transaction).
 * - Alternate request_id, instance, or retry cannot bypass replay key uniqueness.
 */
