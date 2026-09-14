// FILE: lib/credentials/walletPersistenceErrors.ts
// Typed persistence failures for wallet binding and claim writes.

export type WalletPersistenceReasonCode =
  | "database_unavailable"
  | "binding_upsert_failed"
  | "claim_insert_failed"
  | "claim_expire_failed"
  | "rpc_failed"
  | "rpc_rejected"
  | "challenge_insert_failed";

export class WalletPersistenceError extends Error {
  readonly code: WalletPersistenceReasonCode;
  readonly causeDetail?: string;

  constructor(code: WalletPersistenceReasonCode, message: string, causeDetail?: string) {
    super(message);
    this.name = "WalletPersistenceError";
    this.code = code;
    this.causeDetail = causeDetail;
  }
}

export function isWalletPersistenceError(error: unknown): error is WalletPersistenceError {
  return error instanceof WalletPersistenceError;
}
