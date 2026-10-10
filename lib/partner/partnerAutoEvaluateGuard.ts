// Safe auto-evaluate gating for Solana partner verify (Build #512).
// Evaluate is a read-only routing call — never auto-consent or auto-issue receipts.

import type { PartnerVerifyPhase } from "@/components/partner/PartnerVerifyShell";

const AUTO_EVALUATE_BLOCKED_PHASES = new Set<PartnerVerifyPhase>([
  "denied",
  "cancelled",
  "approved",
  "pending_review",
  "returning",
  "return_failed",
  "invalid_link",
  "invalid_binding",
  "expired",
  "missing",
]);

export type PartnerAutoEvaluateContext = {
  solanaNative: boolean;
  holderReady: boolean;
  authLoading: boolean;
  phase: PartnerVerifyPhase;
  invalidLink: boolean;
  flowParamsReady: boolean;
  previewPhaseActive: boolean;
  launchpadPending: boolean;
};

export function shouldAutoEvaluateSolanaPartnerFlow(ctx: PartnerAutoEvaluateContext): boolean {
  if (!ctx.solanaNative) return false;
  if (ctx.authLoading || ctx.previewPhaseActive || ctx.launchpadPending) return false;
  if (ctx.invalidLink || !ctx.flowParamsReady) return false;
  if (!ctx.holderReady) return false;
  if (ctx.phase !== "sign_in") return false;
  return true;
}

export function shouldBlockPartnerEvaluateRetry(phase: PartnerVerifyPhase): boolean {
  return AUTO_EVALUATE_BLOCKED_PHASES.has(phase);
}
