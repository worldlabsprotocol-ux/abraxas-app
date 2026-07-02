// FILE: lib/sui/zklogin/fetchZkProof.ts
// Fetch zkLogin ZK proof via backend proxy (avoids CORS on Mysten prover).

import { getExtendedEphemeralPublicKey } from "@mysten/sui/zklogin";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import type { PartialZkLoginSignature } from "./signingSession";

export interface ZkProofRequest {
  jwt: string;
  ephemeralSecretKey: string;
  maxEpoch: number;
  jwtRandomness: string;
  userSalt: string;
}

interface ProverResponse {
  proofPoints?: PartialZkLoginSignature["proofPoints"];
  issBase64Details?: PartialZkLoginSignature["issBase64Details"];
  headerBase64?: string;
  error?: string;
}

export async function fetchZkLoginProof(req: ZkProofRequest): Promise<PartialZkLoginSignature> {
  const keypair = Ed25519Keypair.fromSecretKey(req.ephemeralSecretKey);
  const extendedEphemeralPublicKey = getExtendedEphemeralPublicKey(keypair.getPublicKey());

  const res = await fetch("/api/zklogin/prover", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jwt: req.jwt,
      extendedEphemeralPublicKey,
      maxEpoch: String(req.maxEpoch),
      jwtRandomness: req.jwtRandomness,
      salt: req.userSalt,
      keyClaimName: "sub",
    }),
  });

  const data = (await res.json()) as ProverResponse & { ok?: boolean };
  if (!res.ok || !data.proofPoints || !data.issBase64Details || !data.headerBase64) {
    throw new Error(data.error ?? "Could not obtain zkLogin proof. Try signing in again.");
  }

  return {
    proofPoints: data.proofPoints,
    issBase64Details: data.issBase64Details,
    headerBase64: data.headerBase64,
  };
}
