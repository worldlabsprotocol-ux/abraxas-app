import { RECEIPT_SIGNING_KEY_ENVS } from "@/lib/partner/chainAttestation/signer";

export const SOLANA_RECEIPT_COMMITMENTS_FLAG_ENV = "ABRAXAS_SOLANA_RECEIPT_COMMITMENTS" as const;
export const SOLANA_RECEIPT_COMMITMENT_RPC_ENV = "ABRAXAS_SOLANA_RECEIPT_COMMITMENT_RPC_URL" as const;
export const SOLANA_RECEIPT_COMMITMENT_KEY_ENV = "ABRAXAS_SOLANA_RECEIPT_COMMITMENT_PRIVATE_KEY" as const;
export const SOLANA_RECEIPT_COMMITMENT_CONFIRMATION_ENV =
  "ABRAXAS_SOLANA_RECEIPT_COMMITMENT_CONFIRMATION" as const;

export type SolanaCommitmentConfirmationLevel = "confirmed" | "finalized";

export function solanaReceiptCommitmentsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const flag = env[SOLANA_RECEIPT_COMMITMENTS_FLAG_ENV]?.trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "enabled";
}

export function resolveSolanaCommitmentRpcUrl(env: NodeJS.ProcessEnv = process.env): string {
  return (
    env[SOLANA_RECEIPT_COMMITMENT_RPC_ENV]?.trim()
    || env.ABRAXAS_SOLANA_GATE_VERIFY_RPC_URL?.trim()
    || "https://api.devnet.solana.com"
  );
}

export function resolveSolanaCommitmentConfirmation(
  env: NodeJS.ProcessEnv = process.env,
): SolanaCommitmentConfirmationLevel {
  const raw = env[SOLANA_RECEIPT_COMMITMENT_CONFIRMATION_ENV]?.trim().toLowerCase();
  return raw === "finalized" ? "finalized" : "confirmed";
}

export function assertCommitmentKeyNotReceiptSigningKey(rawSecret: string, env: NodeJS.ProcessEnv): void {
  for (const name of RECEIPT_SIGNING_KEY_ENVS) {
    const candidate = env[name]?.trim();
    if (candidate && candidate === rawSecret) {
      throw new Error("commitment_key_must_not_match_receipt_signing_key");
    }
  }
}

export function solanaExplorerTransactionUrl(cluster: "devnet", signature: string): string {
  return `https://explorer.solana.com/tx/${encodeURIComponent(signature)}?cluster=${cluster}`;
}
