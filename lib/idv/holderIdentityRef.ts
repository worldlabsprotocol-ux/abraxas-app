// FILE: lib/idv/holderIdentityRef.ts
// Canonical holder keys for identity verification and credential ownership.

import { normalizeSuiAddress } from "@mysten/sui/utils";
import { isChainNeutralHolderSubjectId } from "@/lib/auth/holderSubject/subjectId";

/** Normalize session or API holder key (chain-neutral id or legacy Sui address). */
export function normalizeHolderSubjectKey(raw: string): string {
  const trimmed = raw.trim();
  if (isChainNeutralHolderSubjectId(trimmed)) return trimmed;
  return normalizeSuiAddress(trimmed);
}

export function identityVerificationOrFilter(
  subjectKey: string,
  options?: { includeHolderSubjectColumn?: boolean },
): string {
  const key = normalizeHolderSubjectKey(subjectKey);
  const filters = [`wallet_address.eq.${key}`, `sui_address.eq.${key}`];
  const includeHolderColumn = options?.includeHolderSubjectColumn ?? true;
  if (includeHolderColumn && isChainNeutralHolderSubjectId(key)) {
    filters.push(`holder_subject_id.eq.${key}`);
  }
  return filters.join(",");
}

export async function identityVerificationOrFilterForRuntime(
  subjectKey: string,
): Promise<string> {
  const { chainNeutralIdentitySchemaReady } = await import("@/lib/persistence/chainNeutralSchemaReady");
  const includeHolderSubjectColumn = await chainNeutralIdentitySchemaReady();
  return identityVerificationOrFilter(subjectKey, { includeHolderSubjectColumn });
}

/** Row keys for identity_verifications upsert (wallet_address remains unique anchor). */
export function identityVerificationUpsertKeys(
  subjectKey: string,
  options?: { includeHolderSubjectColumn?: boolean },
): {
  wallet_address: string;
  sui_address: string | null;
  holder_subject_id: string | null;
} {
  const key = normalizeHolderSubjectKey(subjectKey);
  const includeHolderColumn = options?.includeHolderSubjectColumn ?? true;
  if (isChainNeutralHolderSubjectId(key)) {
    return {
      wallet_address: key,
      sui_address: null,
      holder_subject_id: includeHolderColumn ? key : null,
    };
  }
  return {
    wallet_address: key,
    sui_address: key,
    holder_subject_id: null,
  };
}

export async function identityVerificationUpsertKeysForRuntime(subjectKey: string): Promise<{
  wallet_address: string;
  sui_address: string | null;
  holder_subject_id: string | null;
}> {
  const { chainNeutralIdentitySchemaReady } = await import("@/lib/persistence/chainNeutralSchemaReady");
  const includeHolderSubjectColumn = await chainNeutralIdentitySchemaReady();
  return identityVerificationUpsertKeys(subjectKey, { includeHolderSubjectColumn });
}

export function veriffVendorDataForHolder(subjectKey: string): string {
  const key = normalizeHolderSubjectKey(subjectKey);
  if (isChainNeutralHolderSubjectId(key)) return `subject:${key}`;
  return `sui:${key}`;
}

export function parseVeriffVendorDataHolder(vendorData?: string): string | null {
  const subjectMatch = vendorData?.match(/^subject:(abx_hs_[0-9a-f]{32})$/);
  if (subjectMatch?.[1]) return subjectMatch[1];
  const suiMatch = vendorData?.match(/^sui:(.+)$/);
  const legacyMatch = vendorData?.match(/^wallet:(.+)$/);
  const raw = suiMatch?.[1] ?? legacyMatch?.[1] ?? null;
  if (!raw) return null;
  try {
    return normalizeHolderSubjectKey(raw);
  } catch {
    return null;
  }
}
