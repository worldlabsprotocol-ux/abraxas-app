import { createHash } from "node:crypto";
import { Transaction, type VersionedTransactionResponse } from "@solana/web3.js";

/** SHA-256 of the serialized Solana transaction message (legacy prepare flow). */
export function hashLegacyTransactionMessage(tx: Transaction): string {
  return createHash("sha256").update(tx.serializeMessage()).digest("hex");
}

/** SHA-256 of the on-chain transaction message at confirmation time. */
export function hashVersionedTransactionMessage(response: VersionedTransactionResponse): string {
  return createHash("sha256").update(response.transaction.message.serialize()).digest("hex");
}