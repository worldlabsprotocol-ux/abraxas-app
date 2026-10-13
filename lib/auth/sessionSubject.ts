// FILE: lib/auth/sessionSubject.ts

import { normalizeSuiAddress } from "@mysten/sui/utils";
import type { BrowserSession } from "@/lib/auth/browserSession";
import { isChainNeutralHolderSubjectId } from "@/lib/auth/holderSubject/subjectId";

/** Canonical Passport subject for authorization, credentials, and partner flow. */
export function resolveSessionHolderSubjectId(session: BrowserSession): string | null {
  if (session.subjectId) return session.subjectId;
  if (session.holderSubjectId && isChainNeutralHolderSubjectId(session.holderSubjectId)) {
    return session.holderSubjectId;
  }
  if (session.suiAddress) {
    try {
      return normalizeSuiAddress(session.suiAddress);
    } catch {
      return null;
    }
  }
  return null;
}

export function normalizePartnerFlowSubject(raw: string): string {
  if (isChainNeutralHolderSubjectId(raw)) return raw.trim();
  return normalizeSuiAddress(raw);
}
