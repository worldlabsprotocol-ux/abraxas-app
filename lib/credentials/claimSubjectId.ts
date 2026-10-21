// FILE: lib/credentials/claimSubjectId.ts
// Normalize credential claim subject keys (legacy Sui + chain-neutral holder subjects).

import { normalizeSuiAddress } from "@mysten/sui/utils";
import { isChainNeutralHolderSubjectId } from "@/lib/auth/holderSubject/subjectId";
import { normalizeHolderSubjectKey } from "@/lib/idv/holderIdentityRef";

export function normalizeClaimSubjectId(subjectId: string): string {
  const key = normalizeHolderSubjectKey(subjectId);
  if (isChainNeutralHolderSubjectId(key)) return key;
  return normalizeSuiAddress(key);
}
