import { isChainNeutralHolderSubjectId } from "./subjectId";

/** Normalize stored holder keys without using a wallet address as authentication. */
export function normalizeStoredHolderKey(value: string): string {
  const key = value.trim();
  if (isChainNeutralHolderSubjectId(key)) return key;
  if (/^0x[0-9a-fA-F]{64}$/.test(key)) return key.toLowerCase();
  throw new Error("invalid_holder_subject");
}
