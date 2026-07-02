// FILE: lib/sui/zklogin/signAndExecuteTransaction.ts
// Sign and execute a Sui transaction with zkLogin (ephemeral key + ZK proof).

import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { decodeJwt, genAddressSeed, getZkLoginSignature } from "@mysten/sui/zklogin";
import { getSuiClient } from "@/lib/sui/client";
import { fetchZkLoginProof } from "./fetchZkProof";
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

export async function signAndExecuteZkLoginTransaction(
  tx: Transaction,
): Promise<ZkLoginExecuteResult> {
  const signing = loadSigningSession();
  const ephemeralSecretKey = getEphemeralSecretKey();

  if (!signing || !ephemeralSecretKey) {
    throw new Error("Sign in with Google again to pay from your zkLogin wallet.");
  }

  const client = getSuiClient();
  const { epoch } = await client.getLatestSuiSystemState();
  const currentEpoch = Number(epoch);
  if (currentEpoch >= signing.maxEpoch) {
    throw new Error("Wallet session expired. Sign in with Google again.");
  }

  const keypair = Ed25519Keypair.fromSecretKey(ephemeralSecretKey);
  tx.setSender(signing.suiAddress);

  const { bytes, signature: userSignature } = await tx.sign({ client, signer: keypair });

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

  const result = await client.executeTransactionBlock({
    transactionBlock: bytes,
    signature: zkLoginSignature,
    options: { showEffects: true },
  });

  const status = result.effects?.status?.status ?? "unknown";
  if (status !== "success") {
    throw new Error(result.effects?.status?.error ?? "Transaction failed on Sui");
  }

  if (!result.digest) {
    throw new Error("Transaction submitted but digest missing");
  }

  return { digest: result.digest, effectsStatus: status };
}
