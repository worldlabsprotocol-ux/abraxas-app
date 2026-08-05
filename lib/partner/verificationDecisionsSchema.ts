// FILE: lib/partner/verificationDecisionsSchema.ts
// Runtime probe for verification_decisions schema capabilities (migration 053).

import { requireSupabaseAdmin } from "@/lib/supabase/admin";

type IdempotencyKeyColumnState = "unknown" | "available" | "absent";

let idempotencyKeyColumnState: IdempotencyKeyColumnState = "unknown";

export function isMissingIdempotencyKeyColumnError(
  error: { message?: string; code?: string } | null | undefined,
): boolean {
  if (!error) return false;
  if (error.code === "42703") return true;
  const msg = (error.message ?? "").toLowerCase();
  return msg.includes("idempotency_key")
    && (msg.includes("does not exist") || msg.includes("could not find") || msg.includes("column"));
}

/** Whether migration 053 idempotency_key column is present (cached after first probe). */
export async function isVerificationDecisionIdempotencyKeyAvailable(): Promise<boolean> {
  if (idempotencyKeyColumnState === "available") return true;
  if (idempotencyKeyColumnState === "absent") return false;

  const sb = requireSupabaseAdmin();
  const { error } = await sb
    .from("verification_decisions")
    .select("idempotency_key")
    .limit(1);

  if (!error) {
    idempotencyKeyColumnState = "available";
    return true;
  }
  if (isMissingIdempotencyKeyColumnError(error)) {
    idempotencyKeyColumnState = "absent";
    return false;
  }
  throw new Error(error.message ?? "Failed to probe verification_decisions.idempotency_key");
}

export function markVerificationDecisionIdempotencyKeyAbsent(): void {
  idempotencyKeyColumnState = "absent";
}

export function markVerificationDecisionIdempotencyKeyAvailable(): void {
  idempotencyKeyColumnState = "available";
}

/** Test-only — reset cached probe state. */
export function resetVerificationDecisionSchemaProbeForTests(): void {
  idempotencyKeyColumnState = "unknown";
}
