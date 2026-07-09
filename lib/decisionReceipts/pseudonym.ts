// FILE: lib/decisionReceipts/pseudonym.ts
// Pseudonymous subject identifier — no raw wallet address in public receipts.

import { createHash } from "crypto";

const PSEUDONYM_NAMESPACE = "abraxas-receipt-v1";

export function subjectPseudonymId(subjectId: string): string {
  const salt = process.env.ABRAXAS_PSEUDONYM_SALT ?? "abraxas-pilot";
  return createHash("sha256")
    .update(`${PSEUDONYM_NAMESPACE}:${subjectId}:${salt}`, "utf8")
    .digest("hex")
    .slice(0, 32);
}
