// FILE: lib/sui/zklogin/signingSession.ts
// Ephemeral signing material for zkLogin transactions (localStorage, aligned with user session).

import { clearEphemeralSecretKey, loadEphemeralSecretKey, saveEphemeralSecretKey } from "./session";
import type { ZkLoginSignatureInputs } from "@mysten/sui/zklogin";
import {
  readLocalStorage,
  readSessionStorage,
  removeLocalStorage,
  removeSessionStorage,
  writeLocalStorage,
} from "./browserStorage";

const SIGNING_SESSION_KEY = "abraxas_zklogin_signing_v1";
const PROOF_CACHE_KEY = "abraxas_zklogin_proof_v1";

export interface ZkLoginSigningSession {
  suiAddress: string;
  idToken: string;
  userSalt: string;
  jwtRandomness: string;
  maxEpoch: number;
}

export type PartialZkLoginSignature = Omit<ZkLoginSignatureInputs, "addressSeed">;

export interface ZkLoginProofCache {
  proof: PartialZkLoginSignature;
  maxEpoch: number;
  fetchedAt: string;
}

export function saveSigningSession(session: ZkLoginSigningSession): void {
  writeLocalStorage(SIGNING_SESSION_KEY, JSON.stringify(session));
  removeSessionStorage(SIGNING_SESSION_KEY);
}

export function loadSigningSession(): ZkLoginSigningSession | null {
  try {
    let raw = readLocalStorage(SIGNING_SESSION_KEY);
    if (!raw) {
      raw = readSessionStorage(SIGNING_SESSION_KEY);
      if (raw) {
        writeLocalStorage(SIGNING_SESSION_KEY, raw);
        removeSessionStorage(SIGNING_SESSION_KEY);
      }
    }
    if (!raw) return null;
    return JSON.parse(raw) as ZkLoginSigningSession;
  } catch {
    return null;
  }
}

export function clearSigningSession(): void {
  removeSessionStorage(SIGNING_SESSION_KEY);
  removeSessionStorage(PROOF_CACHE_KEY);
  removeLocalStorage(SIGNING_SESSION_KEY);
  removeLocalStorage(PROOF_CACHE_KEY);
  clearEphemeralSecretKey();
}

export function persistEphemeralKey(secretKey: string): void {
  saveEphemeralSecretKey(secretKey);
}

export function getEphemeralSecretKey(): string | null {
  return loadEphemeralSecretKey();
}

export function canSignZkLoginTransactions(expectedAddress?: string | null): boolean {
  const signing = loadSigningSession();
  const ephemeral = getEphemeralSecretKey();
  if (!signing || !ephemeral) return false;
  if (expectedAddress && signing.suiAddress !== expectedAddress) return false;
  return true;
}

export function saveProofCache(proof: PartialZkLoginSignature, maxEpoch: number): void {
  const cache: ZkLoginProofCache = {
    proof,
    maxEpoch,
    fetchedAt: new Date().toISOString(),
  };
  writeLocalStorage(PROOF_CACHE_KEY, JSON.stringify(cache));
  removeSessionStorage(PROOF_CACHE_KEY);
}

export function loadProofCache(maxEpoch: number): PartialZkLoginSignature | null {
  try {
    let raw = readLocalStorage(PROOF_CACHE_KEY);
    if (!raw) raw = readSessionStorage(PROOF_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as ZkLoginProofCache;
    if (cache.maxEpoch !== maxEpoch) return null;
    return cache.proof;
  } catch {
    return null;
  }
}
