// FILE: lib/sui/zklogin/signingSession.ts
// Ephemeral signing material for zkLogin transactions (sessionStorage only).

import { clearEphemeralSecretKey, loadEphemeralSecretKey, saveEphemeralSecretKey } from "./session";
import type { ZkLoginSignatureInputs } from "@mysten/sui/zklogin";

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
  sessionStorage.setItem(SIGNING_SESSION_KEY, JSON.stringify(session));
}

export function loadSigningSession(): ZkLoginSigningSession | null {
  try {
    const raw = sessionStorage.getItem(SIGNING_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ZkLoginSigningSession;
  } catch {
    return null;
  }
}

export function clearSigningSession(): void {
  sessionStorage.removeItem(SIGNING_SESSION_KEY);
  sessionStorage.removeItem(PROOF_CACHE_KEY);
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
  sessionStorage.setItem(PROOF_CACHE_KEY, JSON.stringify(cache));
}

export function loadProofCache(maxEpoch: number): PartialZkLoginSignature | null {
  try {
    const raw = sessionStorage.getItem(PROOF_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as ZkLoginProofCache;
    if (cache.maxEpoch !== maxEpoch) return null;
    return cache.proof;
  } catch {
    return null;
  }
}
