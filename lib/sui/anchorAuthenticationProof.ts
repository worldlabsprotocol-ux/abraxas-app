// FILE: lib/sui/anchorAuthenticationProof.ts
// Anchor authentication proof hash on Sui via Move event emission.

import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { getSuiClient } from "@/lib/sui/client";
import { getSuiDeployment } from "@/lib/sui/config";
import { isPassportIssuerConfigured } from "@/lib/sui/passportIssuer";
import type { AuthenticationEventType } from "@/lib/authenticationProof/types";

function getIssuerKeypair(): Ed25519Keypair | null {
  const secret = process.env.SUI_SPONSOR_SECRET_KEY ?? process.env.SUI_ISSUER_SECRET_KEY;
  if (!secret) return null;
  try {
    const { scheme, secretKey } = decodeSuiPrivateKey(secret.trim());
    if (scheme !== "ED25519") return null;
    return Ed25519Keypair.fromSecretKey(secretKey);
  } catch {
    return null;
  }
}

export async function anchorAuthenticationProofOnSui(input: {
  eventType: AuthenticationEventType;
  recordId: string;
  payloadHash: string;
}): Promise<{ txDigest?: string; attempted: boolean; error?: string }> {
  if (process.env.ON_CHAIN_ANCHOR_ENABLED === "false") {
    return { attempted: false };
  }

  if (!isPassportIssuerConfigured()) {
    return { attempted: false };
  }

  const keypair = getIssuerKeypair();
  const deployment = getSuiDeployment();
  if (!keypair || !deployment.packageId?.startsWith("0x")) {
    return { attempted: false };
  }

  const hashBytes = Buffer.from(input.payloadHash, "hex");
  if (hashBytes.length !== 32) {
    return { attempted: false, error: "invalid hash length" };
  }

  try {
    const tx = new Transaction();
    tx.moveCall({
      target: `${deployment.packageId}::passport::anchor_authentication_proof`,
      arguments: [
        tx.pure.vector("u8", Array.from(Buffer.from(input.eventType, "utf8"))),
        tx.pure.vector("u8", Array.from(Buffer.from(input.recordId, "utf8"))),
        tx.pure.vector("u8", Array.from(hashBytes)),
      ],
    });
    tx.setSender(keypair.getPublicKey().toSuiAddress());

    const sui = getSuiClient();
    const result = await sui.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: { showEffects: true },
    });

    if (result.effects?.status?.status !== "success") {
      return {
        attempted: true,
        error: result.effects?.status?.error ?? "anchor tx failed",
      };
    }

    return { txDigest: result.digest, attempted: true };
  } catch (err) {
    return {
      attempted: true,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * On-chain anchor requires:
 * 1. Move package redeployed with `anchor_authentication_proof` entry function
 * 2. SUI_SPONSOR_SECRET_KEY (or SUI_ISSUER_SECRET_KEY) + issuance cap configured
 * 3. ON_CHAIN_ANCHOR_ENABLED !== "false"
 *
 * Until then proofs are issued with anchor_status `signed` (or `anchor_failed` if tx errors).
 * Proof lookup at GET /api/proof/[id] remains valid via Ed25519 signature verification.
 */
