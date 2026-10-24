// FILE: lib/partner/partnerFlowReceiptOutcome.ts
// Operator-facing receipt outcome — distinct from legacy replay_status.

/** How the server satisfied a partner-flow receipt request. */
export type PartnerFlowReceiptOutcome = "issued" | "reused" | "replayed";

/** Internal resolution path (not exposed on public APIs). */
export type PartnerFlowReceiptResolution =
  | "issued"
  | "verification_request"
  | "idempotency_key"
  | "active_session"
  | "insert_race";

export function partnerFlowReceiptOutcomeFromResolution(
  resolution: PartnerFlowReceiptResolution,
): PartnerFlowReceiptOutcome {
  if (resolution === "issued") return "issued";
  if (resolution === "active_session") return "reused";
  return "replayed";
}

export function isPartnerFlowReceiptOutcome(value: string | null | undefined): value is PartnerFlowReceiptOutcome {
  return value === "issued" || value === "reused" || value === "replayed";
}

/** Backward-compatible when older callers only set replay_status. */
export function resolvePartnerFlowReceiptOutcome(input: {
  receipt_outcome?: PartnerFlowReceiptOutcome | null;
  replay_status?: "issued" | "idempotent_replay" | null;
}): PartnerFlowReceiptOutcome | null {
  if (input.receipt_outcome) return input.receipt_outcome;
  if (input.replay_status === "issued") return "issued";
  if (input.replay_status === "idempotent_replay") return "replayed";
  return null;
}

/** Launchpad / audit labels — not holder lifecycle jargon. */
export function partnerFlowReceiptOutcomeOperatorLabel(outcome: PartnerFlowReceiptOutcome): string {
  switch (outcome) {
    case "issued":
      return "New signed decision issued";
    case "reused":
      return "Existing active decision reused for this request";
    case "replayed":
      return "Exact request replay — same outcome returned";
  }
}

/** Short holder-facing note when redirect includes receipt_outcome. */
export function partnerFlowReceiptOutcomeHolderNote(outcome: PartnerFlowReceiptOutcome | null | undefined): string | null {
  if (outcome === "reused") {
    return "Verified using your existing approval. Your wallet check succeeded; Abraxas applied your still-valid decision for this request.";
  }
  if (outcome === "replayed") {
    return "This request already completed. Abraxas returned the same signed result.";
  }
  return null;
}

/** Optional callback redirect hint — authoritative trust remains on receipt fetch. */
export function partnerFlowReceiptOutcomeRedirectParam(
  outcome: PartnerFlowReceiptOutcome,
): Record<string, string> {
  return { receipt_outcome: outcome };
}
