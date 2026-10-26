// FILE: lib/decisionReceipts/issuanceSchemaCapability.ts

export type IssuanceFinalizationSchemaMode = "legacy" | "v151";

export type IssuanceFinalizationSchemaCapability = {
  mode: IssuanceFinalizationSchemaMode;
  stagedIssuanceEnabled: boolean;
};

export function parseIssuanceFinalizationSchemaFromEnv(
  env: Record<string, string | undefined>,
): IssuanceFinalizationSchemaCapability | null {
  const raw = env.DECISION_RECEIPT_ISSUANCE_FINALIZATION_SCHEMA?.trim().toLowerCase();
  if (!raw) return null;
  if (raw === "legacy" || raw === "off" || raw === "false" || raw === "pre151") {
    return { mode: "legacy", stagedIssuanceEnabled: false };
  }
  if (raw === "v151" || raw === "on" || raw === "true" || raw === "151") {
    return { mode: "v151", stagedIssuanceEnabled: true };
  }
  return null;
}

export class StagedIssuanceUnavailableError extends Error {
  constructor(message = "staged_issuance_unavailable") {
    super(message);
    this.name = "StagedIssuanceUnavailableError";
  }
}
