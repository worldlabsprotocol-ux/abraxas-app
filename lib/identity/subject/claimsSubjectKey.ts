// FILE: lib/identity/subject/claimsSubjectKey.ts
// Deterministic claims storage key for wallet-less individual subjects.

import { createHash, randomBytes } from "crypto";
import { normalizeSuiAddress } from "@mysten/sui/utils";

const CLAIMS_SUBJECT_NAMESPACE = "abraxas-individual-subject-v1";

export function generateAbraxasSubjectId(): string {
  return `sub_ind_${randomBytes(16).toString("hex")}`;
}

/** Maps internal Abraxas subject id to a stable Sui-shaped key for credential_claims compatibility. */
export function claimsSubjectKeyForAbraxasSubject(abraxasSubjectId: string): string {
  const digest = createHash("sha256")
    .update(`${CLAIMS_SUBJECT_NAMESPACE}:${abraxasSubjectId}`, "utf8")
    .digest("hex");
  return normalizeSuiAddress(`0x${digest}`);
}

export function isAbraxasIndividualClaimsKey(subjectKey: string): boolean {
  return /^0x[0-9a-f]{64}$/i.test(subjectKey.trim());
}
