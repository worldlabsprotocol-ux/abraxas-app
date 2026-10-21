// FILE: lib/auth/passportSolanaAuth/walletControlPersistErrors.ts

import { isWalletPersistenceError } from "@/lib/credentials/walletPersistenceErrors";

export function mapWalletControlPersistFailure(error: unknown): string {
  if (isWalletPersistenceError(error)) {
    if (error.code === "rpc_failed") {
      const detail = (error.causeDetail ?? "").toLowerCase();
      if (detail.includes("upsert_wallet_control_claim_atomic") || detail.includes("could not find the function")) {
        return "wallet_control_claim_store_unavailable";
      }
      return "wallet_control_claim_persist_failed";
    }
    if (error.code === "rpc_rejected") return "wallet_control_claim_persist_failed";
    if (error.code === "binding_upsert_failed") return "wallet_control_binding_persist_failed";
    return "wallet_control_persist_failed";
  }

  const message = error instanceof Error ? error.message : "binding_failed";
  if (message.includes("another Passport subject")) {
    return "wallet_bound_to_other_subject";
  }
  if (message.includes("Failed to save Solana binding") || message.includes("Failed to save binding")) {
    return "wallet_control_binding_persist_failed";
  }
  return "wallet_control_persist_failed";
}
