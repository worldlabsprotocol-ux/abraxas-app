export class InstitutionalReplayStoreUnavailableError extends Error {
  readonly code = "replay_store_unavailable" as const;

  constructor(message = "Institutional replay store unavailable") {
    super(message);
    this.name = "InstitutionalReplayStoreUnavailableError";
  }
}

export function isInstitutionalReplaySchemaMissing(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = String((error as { code?: string }).code ?? "");
  const message = String((error as { message?: string }).message ?? "");
  return code === "PGRST205" || message.includes("institutional_eligibility_consume_nonce");
}
