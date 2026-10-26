// FILE: lib/decisionReceipts/issuanceSchemaV110.ts
// Feature gate for receipt schema at issuance (default 1.0.0).

import { DECISION_RECEIPT_SCHEMA_VERSION } from "@/lib/decisionReceipts/types";
import { DECISION_RECEIPT_SCHEMA_V1_1 } from "@/lib/decisionReceipts/schema/v1_1_0";

export type DecisionReceiptIssuanceSchemaMode = "1.0.0" | "1.1.0";

export function parseDecisionReceiptIssuanceSchemaFromEnv(
  env: Record<string, string | undefined> = process.env,
): DecisionReceiptIssuanceSchemaMode {
  const raw = env.DECISION_RECEIPT_ISSUANCE_SCHEMA?.trim();
  if (!raw || raw === DECISION_RECEIPT_SCHEMA_VERSION || raw === "1.0.0" || raw.toLowerCase() === "v1") {
    return "1.0.0";
  }
  if (raw === DECISION_RECEIPT_SCHEMA_V1_1 || raw === "1.1.0" || raw.toLowerCase() === "v1.1") {
    return "1.1.0";
  }
  return "1.0.0";
}

export function resolveIssuanceSchemaVersion(
  env: Record<string, string | undefined> = process.env,
): string {
  return parseDecisionReceiptIssuanceSchemaFromEnv(env) === "1.1.0"
    ? DECISION_RECEIPT_SCHEMA_V1_1
    : DECISION_RECEIPT_SCHEMA_VERSION;
}
