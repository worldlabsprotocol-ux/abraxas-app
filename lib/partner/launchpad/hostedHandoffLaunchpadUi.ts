// FILE: lib/partner/launchpad/hostedHandoffLaunchpadUi.ts
// Launchpad handoff presentation — server-authoritative status, no client-only "completed".

export type HostedHandoffLaunchpadPhase =
  | "none"
  | "ready"
  | "pending"
  | "completed"
  | "expired"
  | "cancelled";

export type HostedHandoffLaunchpadStatus =
  | "created"
  | "completed"
  | "consumed"
  | "cancelled"
  | "expired"
  | "";

export function resolveHostedHandoffLaunchpadPhase(status: HostedHandoffLaunchpadStatus): HostedHandoffLaunchpadPhase {
  if (!status) return "none";
  if (status === "created") return "pending";
  if (status === "completed" || status === "consumed") return "completed";
  if (status === "expired") return "expired";
  if (status === "cancelled") return "cancelled";
  return "none";
}

export function hostedHandoffLaunchpadHeading(phase: HostedHandoffLaunchpadPhase): string {
  switch (phase) {
    case "ready":
      return "Start holder verification";
    case "pending":
      return "Verification in progress";
    case "completed":
      return "Verification completed";
    case "expired":
      return "Handoff expired";
    case "cancelled":
      return "Handoff cancelled";
    default:
      return "Hosted wallet verification";
  }
}

export function hostedHandoffLaunchpadStatusLine(input: {
  phase: HostedHandoffLaunchpadPhase;
  handoffRef: string;
}): string {
  const ref = input.handoffRef ? `Handoff ${input.handoffRef}` : "";
  switch (input.phase) {
    case "pending":
      return ref
        ? `${ref} is waiting for the holder to review, sign, and approve sharing.`
        : "Waiting for the holder to finish verification and consent.";
    case "completed":
      return ref
        ? `${ref} completed. The signed receipt is on file — reopening the holder link shows the same request, not a new verification.`
        : "This handoff completed. Start another verification when you need a fresh receipt.";
    case "expired":
      return "This handoff expired before completion. Start another verification to issue a new holder link.";
    case "cancelled":
      return "This handoff was cancelled. Start another verification to issue a new holder link.";
    case "ready":
      return "Create a handoff when you are ready to send a holder through wallet control on Demo.";
    default:
      return "Create a secure handoff to run a real wallet-control verification on Demo.";
  }
}

export function buildPartnerCallbackResultPath(input: {
  receiptId: string;
  partnerId: string;
  policyId?: string | null;
}): string {
  const params = new URLSearchParams({
    status: "approved",
    receipt_id: input.receiptId,
    partner_id: input.partnerId,
  });
  if (input.policyId) params.set("policy_id", input.policyId);
  return `/partner/callback?${params.toString()}`;
}

export function hostedHandoffLaunchpadPrimaryActionLabel(phase: HostedHandoffLaunchpadPhase): string | null {
  switch (phase) {
    case "none":
    case "ready":
      return "Create handoff";
    case "pending":
      return "Continue verification";
    case "completed":
      return "View completed result";
    case "expired":
    case "cancelled":
      return "Start another verification";
    default:
      return null;
  }
}

export function hostedHandoffLaunchpadSecondaryActionLabel(phase: HostedHandoffLaunchpadPhase): string | null {
  if (phase === "completed") return "Start another verification";
  if (phase === "pending") return "Open verification";
  if (phase === "ready" || phase === "none") return null;
  return null;
}

/** After POST create succeeds — distinct from pending poll refresh. */
export function hostedHandoffLaunchpadFreshReadyHeading(): string {
  return "Verification ready";
}

export function hostedHandoffLaunchpadFreshReadyOpenLabel(): string {
  return "Open verification";
}
