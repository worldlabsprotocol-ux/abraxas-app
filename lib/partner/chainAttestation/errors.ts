export const CHAIN_ATTESTATION_STORE_UNAVAILABLE = "store_unavailable" as const;

export class ChainAttestationStoreUnavailableError extends Error {
  readonly code = CHAIN_ATTESTATION_STORE_UNAVAILABLE;

  constructor() {
    super(CHAIN_ATTESTATION_STORE_UNAVAILABLE);
    this.name = "ChainAttestationStoreUnavailableError";
  }
}

export function isChainAttestationSchemaMissing(
  error: { message?: string; code?: string } | null,
): boolean {
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
