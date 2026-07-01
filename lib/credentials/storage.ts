// FILE: lib/credentials/storage.ts
// Client-side credential cache keyed by Sui holder address.

export const CREDENTIAL_STORAGE_PREFIX = "abraxas_credential_v1";

export interface StoredCredential {
  jwt: string;
  jti: string;
  expires_at: string;
  jurisdiction: string;
  level: string;
  sui_address: string;
  document_type?: string;
}

export function credentialStorageKey(suiAddress: string): string {
  return `${CREDENTIAL_STORAGE_PREFIX}_${suiAddress}`;
}

export function loadStoredCredential(suiAddress: string): StoredCredential | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(credentialStorageKey(suiAddress));
    if (!raw) return null;
    const cred = JSON.parse(raw) as StoredCredential;
    if (new Date(cred.expires_at) < new Date()) return null;
    return cred;
  } catch {
    return null;
  }
}

export function saveStoredCredential(cred: StoredCredential): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(credentialStorageKey(cred.sui_address), JSON.stringify(cred));
}
