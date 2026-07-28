// FILE: lib/sui/zklogin/signAndExecuteTransaction.ts
// Sign zkLogin tx in browser; execute via server (no browser Sui RPC).

import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { decodeJwt, genAddressSeed, getZkLoginSignature } from "@mysten/sui/zklogin";
import { fetchZkLoginProof } from "./fetchZkProof";
import { fetchLoginMaxEpoch } from "./fetchLoginEpoch";
import { ZKLOGIN_EPOCH_BUFFER } from "./constants";
import {
  getEphemeralSecretKey,
  loadProofCache,
  loadSigningSession,
  saveProofCache,
} from "./signingSession";

export interface ZkLoginExecuteResult {
  digest: string;
  effectsStatus: string;
}

/** Sign a base64-encoded transaction block and submit via server execute API. */
export async function signAndExecuteZkLoginTransaction(
  transactionBlockBase64: string,
): Promise<ZkLoginExecuteResult> {
  const signing = loadSigningSession();
  const ephemeralSecretKey = getEphemeralSecretKey();

  if (!signing || !ephemeralSecretKey) {
    throw new Error("Sign in with Google again to pay from your zkLogin wallet.");
  }

  const epochResult = await fetchLoginMaxEpoch();
  if (!epochResult.ok) {
    throw new Error(epochResult.error);
  }
  const currentEpoch = epochResult.maxEpoch - ZKLOGIN_EPOCH_BUFFER;
  if (currentEpoch >= signing.maxEpoch) {
    throw new Error("Wallet session expired. Sign in with Google again.");
  }

  const bytes = Uint8Array.from(Buffer.from(transactionBlockBase64, "base64"));
  const keypair = Ed25519Keypair.fromSecretKey(ephemeralSecretKey);
  const { signature: userSignature } = await keypair.signTransaction(bytes);

  let partialProof = loadProofCache(signing.maxEpoch);
  if (!partialProof) {
    partialProof = await fetchZkLoginProof({
      jwt: signing.idToken,
      ephemeralSecretKey,
      maxEpoch: signing.maxEpoch,
      jwtRandomness: signing.jwtRandomness,
      userSalt: signing.userSalt,
    });
    saveProofCache(partialProof, signing.maxEpoch);
  }

  const decoded = decodeJwt(signing.idToken);
  const addressSeed = genAddressSeed(
    BigInt(signing.userSalt),
    "sub",
    decoded.sub,
    decoded.aud,
  ).toString();

  const zkLoginSignature = getZkLoginSignature({
    inputs: { ...partialProof, addressSeed },
    maxEpoch: signing.maxEpoch,
    userSignature,
  });

  const res = await fetch("/api/sui/zklogin/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      transaction_block: transactionBlockBase64,
      signature: zkLoginSignature,
    }),
  });

  const data = (await res.json()) as {
    ok?: boolean;
    digest?: string;
    effectsStatus?: string;
    error?: string;
  };

  if (!res.ok || !data.ok || !data.digest) {
    throw new Error(data.error ?? "Transaction submission failed");
  }

  return { digest: data.digest, effectsStatus: data.effectsStatus ?? "success" };
}
