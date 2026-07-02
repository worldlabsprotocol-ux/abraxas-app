// FILE: lib/sui/zklogin/session.ts
// Browser session for zkLogin-derived Sui identity.

import { ZKLOGIN_SESSION_KEY, ZKLOGIN_PENDING_KEY } from "./config";

const EPHEMERAL_KEY = "abraxas_zklogin_ephemeral_v1";

export interface ZkLoginPendingSession {
  ephemeralSecretKey: string;
  randomness: string;
  maxEpoch: number;
  provider: "google" | "apple";
  startedAt: string;
}

export interface ZkLoginUserSession {
  suiAddress: string;
  provider: "google" | "apple";
  oauthSub: string;
  email?: string;
  maxEpoch: number;
  loggedInAt: string;
}

export function savePendingSession(session: ZkLoginPendingSession): void {
  sessionStorage.setItem(ZKLOGIN_PENDING_KEY, JSON.stringify(session));
}

export function loadPendingSession(): ZkLoginPendingSession | null {
  try {
    const raw = sessionStorage.getItem(ZKLOGIN_PENDING_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ZkLoginPendingSession;
  } catch {
    return null;
  }
}

export function clearPendingSession(): void {
  sessionStorage.removeItem(ZKLOGIN_PENDING_KEY);
}

export function saveUserSession(session: ZkLoginUserSession): void {
  localStorage.setItem(ZKLOGIN_SESSION_KEY, JSON.stringify(session));
}

export function loadUserSession(): ZkLoginUserSession | null {
  try {
    const raw = localStorage.getItem(ZKLOGIN_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ZkLoginUserSession;
  } catch {
    return null;
  }
}

export function clearUserSession(): void {
  localStorage.removeItem(ZKLOGIN_SESSION_KEY);
  clearEphemeralSecretKey();
  sessionStorage.removeItem("abraxas_zklogin_signing_v1");
  sessionStorage.removeItem("abraxas_zklogin_proof_v1");
}

export function saveEphemeralSecretKey(secretKey: string): void {
  sessionStorage.setItem(EPHEMERAL_KEY, secretKey);
}

export function loadEphemeralSecretKey(): string | null {
  return sessionStorage.getItem(EPHEMERAL_KEY);
}

export function clearEphemeralSecretKey(): void {
  sessionStorage.removeItem(EPHEMERAL_KEY);
}

/** Parse id_token from OAuth implicit callback hash (#id_token=...) */
export function parseIdTokenFromCallbackHash(hash: string): string | null {
  if (!hash.startsWith("#")) return null;
  const params = new URLSearchParams(hash.slice(1));
  return params.get("id_token");
}
