// FILE: lib/partner/twoAppEvaluation/classification.ts
// Distinguish reference/internal activity from external partner evaluation.

import type { TwoAppEvidenceClassification } from "./contract";

const REFERENCE_PARTNER_PREFIXES = [
  "reference-",
  "ref-",
  "institutional-platform",
] as const;

const INTERNAL_PARTNER_PREFIXES = [
  "abraxas-",
  "internal-",
  "harness-",
  "demo-",
] as const;

export function inferEvidenceClassification(input: {
  partnerId: string;
  operatorOverride?: TwoAppEvidenceClassification | null;
  harnessMetadata?: boolean;
}): TwoAppEvidenceClassification {
  if (input.operatorOverride) return input.operatorOverride;
  if (input.harnessMetadata) return "REFERENCE_TEST";

  const id = input.partnerId.trim().toLowerCase();
  if (REFERENCE_PARTNER_PREFIXES.some((p) => id.startsWith(p))) return "REFERENCE_TEST";
  if (INTERNAL_PARTNER_PREFIXES.some((p) => id.startsWith(p))) return "INTERNAL_SANDBOX";
  if (id.startsWith("studio-") && id.length < 24) return "INTERNAL_SANDBOX";

  return "EXTERNAL_SANDBOX";
}

export function isExternalClassification(
  classification: TwoAppEvidenceClassification,
): boolean {
  return classification === "EXTERNAL_SANDBOX" || classification === "PRODUCTION";
}
