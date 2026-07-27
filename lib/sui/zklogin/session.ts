// FILE: lib/sui/zklogin/session.ts
// Browser session for zkLogin-derived Sui identity.

import { ZKLOGIN_SESSION_KEY, ZKLOGIN_PENDING_KEY } from "./config";
import {
  readLocalStorage,
  readSessionStorage,
  removeLocalStorage,
  removeSessionStorage,
  writeLocalStorage,
  writeSessionStorage,
} from "./browserStorage";

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
  writeSessionStorage(ZKLOGIN_PENDING_KEY, JSON.stringify(session));
}

export function loadPendingSession(): ZkLoginPendingSession | null {
  try {
    const raw = readSessionStorage(ZKLOGIN_PENDING_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ZkLoginPendingSession;
  } catch {
    return null;
  }
}

export function clearPendingSession(): void {
  removeSessionStorage(ZKLOGIN_PENDING_KEY);
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("abraxas_zklogin_login_in_flight");
  }
}

export function saveUserSession(session: ZkLoginUserSession): void {
  writeLocalStorage(ZKLOGIN_SESSION_KEY, JSON.stringify(session));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("abraxas:zklogin-session"));
  }
}

export function loadUserSession(): ZkLoginUserSession | null {
  try {
    const raw = readLocalStorage(ZKLOGIN_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ZkLoginUserSession;
  } catch {
    return null;
  }
}

export function clearUserSession(): void {
  removeLocalStorage(ZKLOGIN_SESSION_KEY);
  clearEphemeralSecretKey();
  removeSessionStorage("abraxas_zklogin_signing_v1");
  removeSessionStorage("abraxas_zklogin_proof_v1");
  removeLocalStorage("abraxas_zklogin_signing_v1");
  removeLocalStorage("abraxas_zklogin_proof_v1");
}

function migrateSessionToLocal(key: string): string | null {
  const fromSession = readSessionStorage(key);
  if (!fromSession) return readLocalStorage(key);
  writeLocalStorage(key, fromSession);
  removeSessionStorage(key);
  return fromSession;
}

export function saveEphemeralSecretKey(secretKey: string): void {
  writeLocalStorage(EPHEMERAL_KEY, secretKey);
  removeSessionStorage(EPHEMERAL_KEY);
}

export function loadEphemeralSecretKey(): string | null {
  return migrateSessionToLocal(EPHEMERAL_KEY);
}

export function clearEphemeralSecretKey(): void {
  removeSessionStorage(EPHEMERAL_KEY);
  removeLocalStorage(EPHEMERAL_KEY);
}

/** Parse id_token from OAuth implicit callback hash (#id_token=...) */
export function parseIdTokenFromCallbackHash(hash: string): string | null {
  if (!hash.startsWith("#")) return null;
  const params = new URLSearchParams(hash.slice(1));
  return params.get("id_token");
}
