// FILE: lib/partner/universalIntegration/readinessUi.ts
// Launchpad copy for universal_readiness — server-derived only.

import type { UniversalReadinessDiagnostic, UniversalReadinessPhase } from "./readinessDiagnostic";

export const READINESS_EVIDENCE_SOURCE = "Launchpad health API (server-derived)";

export const READINESS_PHASE_LABELS: Record<UniversalReadinessPhase, string> = {
  not_configured: "Not configured",
  configured: "Configured — sandbox credential needed",
  sandbox_testing: "Sandbox testing",
  sandbox_verified: "Sandbox verified (harness — check live E2E signal)",
  production_review_required: "Production review required",
  production_approved: "Production approved — activation pending",
  production_active: "Production active",
  blocked: "Blocked",
  suspended_or_revoked: "Suspended or revoked",
};

export function describeReadinessPhase(phase: UniversalReadinessPhase): string {
  return READINESS_PHASE_LABELS[phase] ?? phase;
}

export function readinessNextActions(diag: UniversalReadinessDiagnostic): string[] {
  const actions: string[] = [];
  if (diag.blockers.includes("policy_not_pinned")) {
    actions.push("Select and pin an eligibility policy pack in Launchpad.");
  }
  if (diag.blockers.includes("callback_not_configured")) {
    actions.push("Add at least one allowed return URL for your integration.");
  }
  if (diag.blockers.includes("sandbox_credential_missing")) {
    actions.push("Rotate or reveal a sandbox API credential.");
  }
  if (diag.blockers.includes("harness_incomplete")) {
    actions.push("Complete required integration harness scenarios (receipt trust evaluation).");
  }
  if (diag.blockers.includes("no_verified_receipt")) {
    actions.push("Run a real sandbox verification and verify the receipt server-side.");
  }
  if (diag.blockers.includes("live_e2e_not_observed")) {
    actions.push("Run `npm run partner:live-e2e` (Playwright) against staging and re-check live_e2e_complete.");
  }
  if (diag.blockers.includes("production_review_pending")) {
    actions.push("Wait for production access review — sandbox success does not auto-approve production.");
  }
  if (diag.blockers.includes("production_credential_missing")) {
    actions.push("Complete production activation and issue a production credential.");
  }
  if (diag.blockers.includes("integration_health_blocked")) {
    actions.push("Resolve blocked integration health checks (policy, domain, webhook, or harness).");
  }
  if (diag.blockers.includes("application_suspended")) {
    actions.push("Contact Abraxas support to restore the application.");
  }
  if (actions.length === 0 && diag.phase === "sandbox_verified") {
    actions.push("Optional: run live sandbox proof (`npm run partner:live-sandbox`) before requesting production.");
  }
  if (actions.length === 0 && diag.phase === "production_active") {
    actions.push("Monitor integration health and webhook delivery; rotate credentials on schedule.");
  }
  return actions;
}

/** Distinguish offline harness from live holder execution in UI copy. */
export function readinessLiveExecutionHint(
  phase: UniversalReadinessPhase,
  signals?: { live_e2e_complete?: boolean; offline_harness_verified?: boolean },
): string {
  if (phase === "sandbox_verified" && signals?.live_e2e_complete) {
    return "Live holder-flow completion observed (integration events). Production still requires explicit review and activation.";
  }
  if (phase === "sandbox_verified" && !signals?.live_e2e_complete) {
    return "Phase sandbox_verified reflects harness + server receipt checks only — not live_e2e_complete. Run Playwright staging proof before treating this as live partner execution.";
  }
  if (phase === "sandbox_testing") {
    return "Complete the integration harness, then run Playwright live E2E (`npm run partner:live-e2e`) for holder-flow proof.";
  }
  if (phase === "production_active") {
    return "Production traffic must use production credentials and pinned policy versions.";
  }
  return "Readiness reflects server state at load time — refresh after tests.";
}
