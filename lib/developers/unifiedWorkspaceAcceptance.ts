// FILE: lib/developers/unifiedWorkspaceAcceptance.ts
// Build 878 — acceptance criteria helpers (no query-param authorization).

import type { EphemeralSandboxGuidedProgress } from "@/lib/auth/ephemeralWallet/sandboxWorkspaceGuidedProgress";

export type UnifiedWorkspaceContinuitySnapshot = {
  route: string;
  integration_embed_active: boolean;
  server_guided_progress: boolean;
  wallet_proof_restored: boolean;
  receipt_validation_restored: boolean;
};

export function buildUnifiedWorkspaceContinuitySnapshot(input: {
  pathname: string;
  search: string;
  guidedProgress: EphemeralSandboxGuidedProgress | null;
  clientHasWalletProof: boolean;
  clientReceiptValidationStatus: string;
}): UnifiedWorkspaceContinuitySnapshot {
  const params = new URLSearchParams(input.search);
  const integrationEmbed =
    params.get("integration") === "1" || params.get("source") === "developer-workspace";
  const onUnifiedRoute = input.pathname.includes("/developers/ephemeral-sandbox");
  return {
    route: `${input.pathname}${input.search}`,
    integration_embed_active: onUnifiedRoute && integrationEmbed,
    server_guided_progress: Boolean(input.guidedProgress?.receipt_id),
    wallet_proof_restored:
      input.clientHasWalletProof
      || Boolean(input.guidedProgress?.receipt_id && input.guidedProgress.decision),
    receipt_validation_restored:
      input.clientReceiptValidationStatus === "validated"
      || input.guidedProgress?.receipt_validation?.status === "validated",
  };
}

export function unifiedWorkspaceAcceptanceMet(snapshot: UnifiedWorkspaceContinuitySnapshot): boolean {
  return snapshot.integration_embed_active && snapshot.route.includes("/developers/ephemeral-sandbox");
}

/** Query params may deep-link UI only; proof must come from server progress or live session execution. */
export function queryParamsMustNotAuthorizePartnerAdmin(search: string): boolean {
  const params = new URLSearchParams(search);
  return !params.has("partner_admin") && !params.has("launchpad_signed_in");
}
