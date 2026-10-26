// FILE: lib/decisionReceipts/v1_1_0/v11PersistenceCapability.ts

export type V11DedicatedPersistenceMode = "legacy" | "v152";

export type V11PersistenceCapability = {
  dedicatedMode: V11DedicatedPersistenceMode;
  dedicatedColumnsEnabled: boolean;
  /** True only when schema v152 + founder env authorization. */
  atomicFinalizeEnabled: boolean;
};

export function parseV11DedicatedPersistenceFromEnv(
  env: Record<string, string | undefined>,
): V11PersistenceCapability | null {
  const raw = env.DECISION_RECEIPT_V11_DEDICATED_PERSISTENCE?.trim().toLowerCase();
  if (!raw) return null;
  if (raw === "legacy") {
    return {
      dedicatedMode: "legacy",
      dedicatedColumnsEnabled: false,
      atomicFinalizeEnabled: false,
    };
  }
  if (raw === "v152") {
    const atomic = env.DECISION_RECEIPT_V11_ATOMIC_FINALIZE?.trim().toLowerCase() === "authorized";
    return {
      dedicatedMode: "v152",
      dedicatedColumnsEnabled: true,
      atomicFinalizeEnabled: atomic,
    };
  }
  return null;
}
