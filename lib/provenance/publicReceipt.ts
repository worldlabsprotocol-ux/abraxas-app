// FILE: lib/provenance/publicReceipt.ts
// Ensure provenance receipts remain privacy-preserving on public surfaces.

import type { DecisionReceiptPublicView } from "@/lib/decisionReceipts/types";

const RAW_CONTENT_PATTERNS = [
  /image\//i,
  /video\//i,
  /audio\//i,
  /application\/pdf/i,
  /base64/i,
  /BEGIN [A-Z ]+ PRIVATE KEY/i,
];

export function provenanceReceiptIsPublicSafe(view: DecisionReceiptPublicView): boolean {
  const serialized = JSON.stringify(view);
  for (const pattern of RAW_CONTENT_PATTERNS) {
    if (pattern.test(serialized)) return false;
  }
  for (const ref of view.evaluated_claim_refs) {
    if ("claim_value" in (ref as object)) return false;
  }
  return view.artifact_type === "eligibility_decision_receipt";
}
