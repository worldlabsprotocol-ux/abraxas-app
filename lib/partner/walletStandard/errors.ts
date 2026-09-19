// FILE: lib/partner/walletStandard/errors.ts
// Typed fail-closed errors. Never fall back to memory.

export const WALLET_STANDARD_STORE_UNAVAILABLE = "store_unavailable" as const;

export class WalletStandardStoreUnavailableError extends Error {
  readonly code = WALLET_STANDARD_STORE_UNAVAILABLE;

  constructor() {
    super(WALLET_STANDARD_STORE_UNAVAILABLE);
    this.name = "WalletStandardStoreUnavailableError";
  }
}

export function isWalletStoreSchemaMissing(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const code = String(error.code ?? "");
  const message = String(error.message ?? "").toLowerCase();
  return (
    code === "42P01"
    || code === "PGRST205"
    || code === "PGRST204"
    || message.includes("does not exist")
    || message.includes("could not find the table")
    || message.includes("could not find the function")
    || message.includes("schema cache")
  );
}
