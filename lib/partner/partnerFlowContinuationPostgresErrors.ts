// FILE: lib/partner/partnerFlowContinuationPostgresErrors.ts
// Distinguish benign Postgres uniqueness races from genuine continuation store outages.

export function isPostgresUniqueViolation(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "23505") return true;
  const message = String(error.message ?? "").toLowerCase();
  return message.includes("duplicate key")
    || message.includes("unique constraint")
    || message.includes("idx_partner_flow_continuations_opaque_verify_request");
}
