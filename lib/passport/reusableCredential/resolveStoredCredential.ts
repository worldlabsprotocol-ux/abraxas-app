// FILE: lib/passport/reusableCredential/resolveStoredCredential.ts
import "server-only";

import {
  getPassportReusableCredentialByIdDirect,
  listPassportReusableCredentialsForHolderDirect,
} from "@/lib/persistence/passportReusableCredentialDirectStore";
import type { SignedPassportReusableCredential } from "./contract";
import { isPassportReusableCredentialStorageEnabled } from "./storageGate";

export async function listIssuerBackedReusableCredentials(
  holderSubjectId: string,
): Promise<SignedPassportReusableCredential[]> {
  if (!isPassportReusableCredentialStorageEnabled()) return [];
  return listPassportReusableCredentialsForHolderDirect(holderSubjectId);
}

export async function resolveHolderReusableCredential(input: {
  holderSubjectId: string;
  credentialId?: string | null;
}): Promise<SignedPassportReusableCredential | null> {
  if (!isPassportReusableCredentialStorageEnabled()) return null;
  if (input.credentialId) {
    const cred = await getPassportReusableCredentialByIdDirect(input.credentialId);
    if (!cred || cred.payload.holder_subject_id !== input.holderSubjectId) return null;
    return cred;
  }
  const list = await listPassportReusableCredentialsForHolderDirect(input.holderSubjectId);
  return list[0] ?? null;
}
