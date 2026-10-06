// FILE: lib/admin/operatorPresentation.ts
// Plain-language operator labels — authoritative backend state, no invented workflow.

export type OperatorReviewState =
  | "needs_review"
  | "waiting"
  | "blocked"
  | "escalated"
  | "completed";

export type OperatorAttentionSignal = "none" | "watch" | "urgent";

export interface OperatorQueuePresentation {
  reviewType: string;
  subjectLabel: string;
  stateLabel: string;
  stateTone: OperatorReviewState;
  reasonEntered: string;
  waitingLabel: string | null;
  attention: OperatorAttentionSignal;
  nextAction: string;
}

const BINDING_PRODUCTION_STATUS_LABELS: Record<string, string> = {
  sandbox_only: "Sandbox only",
  production_requested: "Production requested",
  production_under_review: "Under review",
  production_approved: "Approved — not yet active",
  production_active: "Production active",
  production_rejected: "Rejected",
  production_suspended: "Suspended",
};

const APP_PRODUCTION_DECISION_LABELS: Record<string, string> = {
  pending: "Needs review",
  approved: "Activated",
  rejected: "Rejected",
};

export function formatOperatorWaitingAge(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours < 1) return "Waiting less than 1 hour";
  if (hours < 24) return `Waiting ${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.floor(hours / 24);
  return `Waiting ${days} day${days === 1 ? "" : "s"}`;
}

export function bindingProductionStatusLabel(status: string | null | undefined): string {
  if (!status) return "Unknown";
  return BINDING_PRODUCTION_STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

export function appProductionDecisionLabel(status: string | null | undefined): string {
  if (!status) return "Unknown";
  return APP_PRODUCTION_DECISION_LABELS[status] ?? status.replace(/_/g, " ");
}

export function bindingScopeNotice(bindingRole: string | null | undefined): string {
  if (bindingRole === "primary") {
    return "Primary policy binding — uses application-level production review.";
  }
  return "Secondary policy binding — production authorization is per binding and fail-closed.";
}

export function productionAuthorizationScopeWarning(scope: "application" | "binding"): string {
  if (scope === "application") {
    return "This decision activates the application environment and primary policy path. It does not authorize every configured policy binding.";
  }
  return "This decision applies to this policy binding only. Other bindings retain their own authorization state.";
}

export function readinessClassLabel(value: string | null | undefined): string {
  switch (value) {
    case "ready":
      return "Ready";
    case "attention":
      return "Needs attention";
    case "blocked":
      return "Blocked";
    case "unknown":
      return "Not measured";
    default:
      return value?.replace(/_/g, " ") ?? "Not measured";
  }
}

export function presentAppProductionQueueItem(input: {
  appLabel: string;
  policyId: string;
  policyVersion: number;
  decisionStatus: string;
  submittedAt: string;
  sandboxReadinessClass: string;
  webhookHealthClass: string;
  testConsoleClass: string;
  blockers?: string[];
}): OperatorQueuePresentation {
  const blocked = (input.blockers?.length ?? 0) > 0;
  const tone: OperatorReviewState = input.decisionStatus === "pending"
    ? (blocked ? "blocked" : "needs_review")
    : input.decisionStatus === "approved"
      ? "completed"
      : "completed";

  return {
    reviewType: "Application production activation",
    subjectLabel: input.appLabel,
    stateLabel: appProductionDecisionLabel(input.decisionStatus),
    stateTone: tone,
    reasonEntered: "Partner requested production activation for the primary integration path.",
    waitingLabel: input.decisionStatus === "pending" ? formatOperatorWaitingAge(input.submittedAt) : null,
    attention: blocked ? "urgent" : input.sandboxReadinessClass === "attention" ? "watch" : "none",
    nextAction: input.decisionStatus === "pending"
      ? "Review sandbox readiness, then approve or reject application production activation."
      : "No pending application-level decision.",
  };
}

export function presentBindingProductionQueueItem(input: {
  appLabel: string;
  packId: string;
  resultFamily: string;
  policyVersion: number;
  bindingRole: string;
  productionStatus: string;
  decisionStatus: string;
  submittedAt: string;
  verifiedReceipts: number;
  requestVolume: number;
  blockers: string[];
}): OperatorQueuePresentation {
  const blocked = input.blockers.length > 0;
  const tone: OperatorReviewState = input.decisionStatus === "pending"
    ? (blocked ? "blocked" : "needs_review")
    : "completed";

  return {
    reviewType: "Binding production authorization",
    subjectLabel: `${input.appLabel} · ${input.resultFamily}`,
    stateLabel: bindingProductionStatusLabel(input.productionStatus),
    stateTone: tone,
    reasonEntered: bindingScopeNotice(input.bindingRole),
    waitingLabel: input.decisionStatus === "pending" ? formatOperatorWaitingAge(input.submittedAt) : null,
    attention: blocked ? "urgent" : input.verifiedReceipts === 0 ? "watch" : "none",
    nextAction: input.decisionStatus === "pending"
      ? "Review binding-scoped sandbox evidence, then approve or reject this binding only."
      : input.productionStatus === "production_active"
        ? "Binding is production active. Suspend or reactivate if operational state must change."
        : "No pending binding decision.",
  };
}

export function operatorEmptyQueueCopy(queueName: string): { title: string; body: string } {
  return {
    title: "Nothing needs review right now",
    body: `No ${queueName} items are waiting for operator action. New partner requests will appear here when submitted.`,
  };
}

const DESIGN_PARTNER_STATUS_LABELS: Record<string, string> = {
  submitted: "Awaiting operator review",
  approved: "Approved — sandbox provisioning",
  rejected: "Rejected",
  onboarded: "Onboarded as partner",
};

export function designPartnerStatusLabel(status: string | null | undefined): string {
  if (!status) return "Unknown";
  return DESIGN_PARTNER_STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

export function presentDesignPartnerOperatorView(input: {
  company: string;
  status: string;
  promotedPartnerId: string | null;
  integrationType: string;
  useCase: string | null;
  phase?: string | null;
  blockerCodes?: string[];
}): OperatorQueuePresentation {
  const onboarded = Boolean(input.promotedPartnerId) || input.status === "onboarded";
  const rejected = input.status === "rejected";
  const blocked = (input.blockerCodes?.length ?? 0) > 0;
  const tone: OperatorReviewState = rejected
    ? "completed"
    : onboarded
      ? "completed"
      : input.status === "submitted"
        ? "needs_review"
        : blocked
          ? "blocked"
          : "waiting";

  return {
    reviewType: "Design partner progress",
    subjectLabel: input.company,
    stateLabel: designPartnerStatusLabel(input.status),
    stateTone: tone,
    reasonEntered: input.useCase
      ? `Use case: ${input.useCase}`
      : `Integration type: ${input.integrationType}`,
    waitingLabel: input.status === "submitted" ? "Awaiting initial operator review" : null,
    attention: input.status === "submitted" ? "urgent" : blocked ? "watch" : "none",
    nextAction: input.status === "submitted"
      ? "Review application details, then approve or reject."
      : input.status === "approved" && !onboarded
        ? "Complete sandbox signoff and promote to relying party when ready."
        : onboarded
          ? "Monitor sandbox pilot progress and production readiness."
          : rejected
            ? "No further action unless partner reapplies."
            : "Review current integration progress.",
  };
}

export function operatorActionConsequence(input: {
  scope: "application" | "binding" | "credential";
  action: string;
  reversible: boolean;
}): string {
  const scopeLabel = input.scope === "application"
    ? "application production activation"
    : input.scope === "binding"
      ? "this policy binding"
      : "the production credential";

  const base = `This will ${input.action} ${scopeLabel}.`;
  return input.reversible
    ? `${base} The action is reversible through the operator control plane.`
    : `${base} Confirm only after reviewing evidence — some effects require partner follow-up.`;
}
