// FILE: lib/persistence/holderIdentityCanonicalSuiBinding.ts
// Build #579: trust boundary for canonical sessions matching legacy sui_address IDV rows.

import "server-only";

import { isChainNeutralHolderSubjectId } from "@/lib/auth/holderSubject/subjectId";
import { normalizeHolderSubjectKey } from "@/lib/idv/holderIdentityRef";
import { queryAbraxasPg } from "./pgPool";

function isMissingRelation(error: unknown): boolean {
  return error instanceof Error && /relation .* does not exist|42P01/.test(error.message);
}

/** Extract normalized Sui address from a session-bound CAIP-10 when present. */
export function suiAddressFromWalletCaip10(walletCaip10: string | null | undefined): string | null {
  const raw = walletCaip10?.trim();
  if (!raw) return null;
  const parts = raw.split(":");
  if (parts.length < 3) return null;
  if (!parts[0]?.toLowerCase().startsWith("sui")) return null;
  const addr = parts.slice(2).join(":").trim();
  if (!/^0x[0-9a-f]{64}$/i.test(addr)) return null;
  return normalizeHolderSubjectKey(addr);
}

export function walletCaip10AddressMatchesSui(
  walletCaip10: string | null | undefined,
  suiAddress: string | null | undefined,
): boolean {
  const fromCaip = suiAddressFromWalletCaip10(walletCaip10);
  const sui = suiAddress?.trim() ? normalizeHolderSubjectKey(suiAddress.trim()) : null;
  if (!fromCaip || !sui) return false;
  return fromCaip.toLowerCase() === sui.toLowerCase();
}

export type CanonicalSuiBindingEvaluation = {
  authoritativeSuiAddress: string | null;
  ambiguousLegacyConflict: boolean;
  missingCanonicalLegacySuiBinding: boolean;
};

/**
 * Pure evaluation: when may a canonical session OR-match legacy sui_address in IDV counts?
 * Requires legacy link to canonical and/or verified wallet row bound to the same canonical subject.
 */
export function evaluateCanonicalSuiIdvBinding(input: {
  canonicalSubjectId: string | null;
  sessionSuiAddress?: string | null;
  sessionWalletCaip10?: string | null;
  suiLegacyLinkSubjectId?: string | null;
  verifiedWalletAccountSubjectId?: string | null;
}): CanonicalSuiBindingEvaluation {
  const canonical = input.canonicalSubjectId?.trim() ?? null;
  const suiRaw = input.sessionSuiAddress?.trim() ?? null;
  const suiLegacy = input.suiLegacyLinkSubjectId?.trim() ?? null;
  const walletSubject = input.verifiedWalletAccountSubjectId?.trim() ?? null;

  if (!canonical || !isChainNeutralHolderSubjectId(canonical)) {
    return {
      authoritativeSuiAddress: null,
      ambiguousLegacyConflict: false,
      missingCanonicalLegacySuiBinding: false,
    };
  }

  let ambiguous = false;
  if (suiLegacy && suiLegacy !== canonical) {
    ambiguous = true;
  }
  if (walletSubject && walletSubject !== canonical) {
    ambiguous = true;
  }
  if (suiLegacy && walletSubject && suiLegacy !== walletSubject) {
    ambiguous = true;
  }

  if (ambiguous || !suiRaw) {
    return {
      authoritativeSuiAddress: null,
      ambiguousLegacyConflict: ambiguous,
      missingCanonicalLegacySuiBinding: Boolean(suiRaw && !ambiguous),
    };
  }

  const suiKey = normalizeHolderSubjectKey(suiRaw);
  const legacyLinkAuthorizes = suiLegacy === canonical;
  const walletAuthorizes =
    walletSubject === canonical
    && walletCaip10AddressMatchesSui(input.sessionWalletCaip10, suiKey);

  const authoritativeSuiAddress = legacyLinkAuthorizes || walletAuthorizes ? suiKey : null;

  return {
    authoritativeSuiAddress,
    ambiguousLegacyConflict: ambiguous,
    missingCanonicalLegacySuiBinding: !authoritativeSuiAddress,
  };
}

export async function resolveVerifiedWalletAccountSubjectId(
  walletCaip10: string | null | undefined,
): Promise<string | null> {
  const caip10 = walletCaip10?.trim();
  if (!caip10) return null;
  try {
    const { rows } = await queryAbraxasPg<{ subject_id: string }>(
      `SELECT subject_id FROM public.passport_holder_wallet_accounts WHERE caip10 = $1 LIMIT 1`,
      [caip10],
    );
    return rows[0]?.subject_id ?? null;
  } catch (error) {
    if (isMissingRelation(error)) return null;
    throw error;
  }
}
