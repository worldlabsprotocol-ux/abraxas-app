import { Keypair, PublicKey } from "@solana/web3.js";
import {
  assertCommitmentKeyNotReceiptSigningKey,
  SOLANA_RECEIPT_COMMITMENT_KEY_ENV,
} from "@/lib/decisionReceipts/solanaCommitment/config";

export interface SolanaReceiptCommitter {
  publicKey: PublicKey;
  keypair: Keypair;
}

function parseSecretKeyHex(raw: string): Uint8Array | null {
  const hex = raw.startsWith("0x") ? raw.slice(2) : raw;
  if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length % 2 !== 0) return null;
  const bytes = Uint8Array.from(Buffer.from(hex, "hex"));
  if (bytes.length !== 32 && bytes.length !== 64) return null;
  return bytes;
}

export function loadSolanaReceiptCommitter(env: NodeJS.ProcessEnv = process.env):
  | { ok: true; committer: SolanaReceiptCommitter }
  | { ok: false; reason: "signer_unavailable" } {
  const raw = env[SOLANA_RECEIPT_COMMITMENT_KEY_ENV]?.trim() ?? "";
  if (!raw) return { ok: false, reason: "signer_unavailable" };
  try {
    assertCommitmentKeyNotReceiptSigningKey(raw, env);
  } catch {
    return { ok: false, reason: "signer_unavailable" };
  }
  const secret = parseSecretKeyHex(raw);
  if (!secret) return { ok: false, reason: "signer_unavailable" };
  try {
    const keypair = secret.length === 64
      ? Keypair.fromSecretKey(secret)
      : Keypair.fromSeed(secret);
    return { ok: true, committer: { keypair, publicKey: keypair.publicKey } };
  } catch {
    return { ok: false, reason: "signer_unavailable" };
  }
}
