// FILE: lib/partner/actionControlPlane/view.ts
// Pure control-plane projection. No secrets, receipts, or holder fields.

import { hasProductionLaunchpadCallback } from "@/lib/partner/launchpad/productionCallbackReadiness";
import { isLaunchpadReturnUrlAllowlisted } from "@/lib/partner/launchpad/launchpadReturnUrlAllowlist";
import { REQUIRED_HARNESS_SCENARIOS } from "@/lib/partner/launchpad/partnerTestHarness";
import type { SandboxReadinessEvidence } from "@/lib/partner/launchpad/sandboxReadiness/plan";
import {
  ACTION_AUTHORIZATION_CORE_RULES,
  ACTION_CONTROL_PLANE_CAPABILITIES,
  ACTION_CONTROL_PLANE_CAPABILITY_META,
  ACTION_CONTROL_PLANE_CHECKLIST,
  ACTION_CONTROL_PLANE_NOT_PARALLEL,
  ACTION_CONTROL_PLANE_PRODUCTION,
  ACTION_CONTROL_PLANE_VERSION,
  type ActionControlPlaneCapabilityId,
  type ActionControlPlaneChecklistId,
  type ActionControlPlaneReadiness,
  type ActionControlPlaneSafeReason,
} from "./contract";
import {
  activityMarksCapability,
  buildActionControlPlaneLifecycle,
  type ActionControlPlaneActivityRow,
  type ActionControlPlaneLifecycleItem,
} from "./lifecycle";
import { sanitizeActionControlPlaneValue } from "./sanitize";

export interface ActionControlPlaneEvidence {
  applicationName: string;
  readiness: SandboxReadinessEvidence;
  activity: ActionControlPlaneActivityRow[];
  productionAccess: {
    status: "none" | "pending" | "approved" | "rejected";
    request_ref: string | null;
  };
  activeProductionKey: boolean;
}

export interface ActionControlPlaneCapabilityView {
  id: ActionControlPlaneCapabilityId;
  label: string;
  configured: boolean;
  readiness: ActionControlPlaneReadiness;
  reason: ActionControlPlaneSafeReason;
  next_step: string;
  href: string;
}

export interface ActionControlPlaneChecklistItem {
  id: ActionControlPlaneChecklistId;
  label: string;
  status: ActionControlPlaneReadiness;
  reason: ActionControlPlaneSafeReason;
  next_step: string;
}

export interface ActionControlPlaneView {
  ok: true;
  version: typeof ACTION_CONTROL_PLANE_VERSION;
  notice: typeof ACTION_CONTROL_PLANE_NOT_PARALLEL;
  production_upgrade: typeof ACTION_CONTROL_PLANE_PRODUCTION;
  action_authorization_rules: typeof ACTION_AUTHORIZATION_CORE_RULES;
  application: {
    id: string;
    public_slug: string;
    application_name: string;
    environment: "sandbox" | "production";
    status: string;
    policy_id: string;
    policy_version: number;
    policy_template_id: string;
  };
  capabilities: ActionControlPlaneCapabilityView[];
  checklist: ActionControlPlaneChecklistItem[];
  lifecycle: ActionControlPlaneLifecycleItem[];
  overall: ActionControlPlaneReadiness;
}

function policySelected(evidence: SandboxReadinessEvidence): boolean {
  return Boolean(evidence.policyId) && evidence.policyVersion > 0;
}

function callbackAllowlisted(evidence: SandboxReadinessEvidence): boolean {
  return evidence.allowedReturnUrls.some((url) => isLaunchpadReturnUrlAllowlisted(url));
}

function partnerFlowTested(evidence: SandboxReadinessEvidence): boolean {
  return evidence.harnessCompleted.includes("approved");
}

function receiptConnected(evidence: SandboxReadinessEvidence): boolean {
  const required = REQUIRED_HARNESS_SCENARIOS.filter((id) => id !== "pii_absent");
  return required.every((id) => evidence.harnessCompleted.includes(id));
}

function webhookVerified(evidence: SandboxReadinessEvidence): boolean {
  if (!evidence.webhookConfigured) return false;
  if (evidence.deliveryFailureBlocker) return false;
  const webhookRun = evidence.lastStageRuns?.webhook_test;
  return evidence.latestDeliveryStatus === "delivered"
    || webhookRun?.status === "pass"
    || webhookRun?.code === "webhook_hmac_verified";
}

function productionState(input: ActionControlPlaneEvidence): {
  readiness: ActionControlPlaneReadiness;
  reason: ActionControlPlaneSafeReason;
  next_step: string;
} {
  if (input.readiness.environment === "production" && input.activeProductionKey) {
    return {
      readiness: "ready",
      reason: "reviewed_active",
      next_step: "Production is already reviewed and active. Keep receipts pinned to the adopted policy version.",
    };
  }
  if (input.productionAccess.status === "pending") {
    return {
      readiness: "action_required",
      reason: "review_pending",
      next_step: "A Production upgrade request is waiting for review. The control plane cannot approve it.",
    };
  }
  return {
    readiness: "blocked",
    reason: "review_required",
    next_step: ACTION_CONTROL_PLANE_PRODUCTION.notice,
  };
}

function capabilityView(
  id: ActionControlPlaneCapabilityId,
  input: ActionControlPlaneEvidence,
): ActionControlPlaneCapabilityView {
  const meta = ACTION_CONTROL_PLANE_CAPABILITY_META[id];
  const { readiness } = input;
  if (id === "hosted_partner_flow") {
    const ok = policySelected(readiness) && callbackAllowlisted(readiness) && partnerFlowTested(readiness);
    return {
      id, label: meta.label, configured: policySelected(readiness) && readiness.allowedReturnUrls.length > 0,
      readiness: ok ? "ready" : policySelected(readiness) ? "action_required" : "blocked",
      reason: ok ? "permitted" : policySelected(readiness) ? "action_required" : "not_run",
      next_step: ok ? "Hosted Partner Flow is ready for sandbox callbacks." : meta.next_when_missing,
      href: meta.href,
    };
  }
  if (id === "receipt_verify") {
    const ok = receiptConnected(readiness);
    return {
      id, label: meta.label, configured: partnerFlowTested(readiness),
      readiness: ok ? "ready" : "action_required",
      reason: ok ? "permitted" : "action_required",
      next_step: ok ? "Server receipt verification harness has passed in sandbox." : meta.next_when_missing,
      href: meta.href,
    };
  }
  if (id === "webhooks") {
    const ok = webhookVerified(readiness);
    return {
      id, label: meta.label, configured: readiness.webhookConfigured,
      readiness: ok ? "ready" : readiness.deliveryFailureBlocker ? "blocked" : "action_required",
      reason: ok ? "permitted" : readiness.deliveryFailureBlocker ? "webhook_failed" : "action_required",
      next_step: ok ? "Webhook HMAC path is verified. Events are still not authorization." : meta.next_when_missing,
      href: meta.href,
    };
  }
  if (id === "trading_venue") {
    const tested = activityMarksCapability(input.activity, "trading_venue");
    return {
      id, label: meta.label, configured: tested,
      readiness: tested ? "ready" : "not_run",
      reason: tested ? "permitted" : "not_run",
      next_step: tested ? "Sandbox trading preflight recorded a safe allow or deny." : meta.next_when_missing,
      href: meta.href,
    };
  }
  if (id === "payment_authorization") {
    const tested = activityMarksCapability(input.activity, "payment_authorization");
    return {
      id, label: meta.label, configured: tested,
      readiness: tested ? "ready" : "not_run",
      reason: tested ? "permitted" : "not_run",
      next_step: tested ? "Sandbox payment preflight recorded a safe allow or deny. It is not a charge." : meta.next_when_missing,
      href: meta.href,
    };
  }
  const tested = activityMarksCapability(input.activity, "wallet_standard_binding");
  return {
    id, label: meta.label, configured: tested,
    readiness: tested ? "ready" : "optional",
    reason: tested ? "permitted" : "optional_not_required",
    next_step: tested
      ? "Optional Wallet Standard binding was exercised without exposing a wallet address."
      : meta.next_when_missing,
    href: meta.href,
  };
}

const CHECKLIST_LABELS: Record<ActionControlPlaneChecklistId, string> = {
  policy_selected: "Policy selected",
  hosted_callback_allowlisted: "Hosted callback allowlisted",
  partner_flow_tested: "Partner Flow tested",
  receipt_verification_connected: "Receipt verification connected",
  webhook_endpoint_verified: "Webhook endpoint verified",
  trading_preflight_tested: "Trading preflight tested",
  payment_preflight_tested: "Payment preflight tested",
  wallet_binding_tested: "Optional wallet binding tested",
  production_upgrade_readiness: "Production upgrade readiness",
};

function checklistItem(
  id: ActionControlPlaneChecklistId,
  input: ActionControlPlaneEvidence,
): ActionControlPlaneChecklistItem {
  const { readiness } = input;
  if (id === "policy_selected") {
    const ok = policySelected(readiness);
    return {
      id, label: CHECKLIST_LABELS[id],
      status: ok ? "ready" : "blocked",
      reason: ok ? "permitted" : "not_run",
      next_step: ok
        ? `Policy ${readiness.policyId} v${readiness.policyVersion} is pinned.`
        : "Choose a Launchpad policy pack before testing.",
    };
  }
  if (id === "hosted_callback_allowlisted") {
    const ok = callbackAllowlisted(readiness);
    const https = hasProductionLaunchpadCallback(readiness.allowedReturnUrls);
    return {
      id, label: CHECKLIST_LABELS[id],
      status: ok ? "ready" : "action_required",
      reason: ok ? "permitted" : "action_required",
      next_step: ok
        ? https
          ? "An allowlisted HTTPS callback is configured."
          : "A localhost callback is allowlisted for sandbox only."
        : "Add an allowlisted hosted callback URL.",
    };
  }
  if (id === "partner_flow_tested") {
    const ok = partnerFlowTested(readiness);
    return {
      id, label: CHECKLIST_LABELS[id],
      status: ok ? "ready" : "not_run",
      reason: ok ? "permitted" : "not_run",
      next_step: ok ? "An approved sandbox Partner Flow harness case passed." : "Run the approved Partner Flow harness case.",
    };
  }
  if (id === "receipt_verification_connected") {
    const ok = receiptConnected(readiness);
    return {
      id, label: CHECKLIST_LABELS[id],
      status: ok ? "ready" : "action_required",
      reason: ok ? "permitted" : "action_required",
      next_step: ok
        ? "Receipt harness covers approved, denied, expired, revoked, replay, and partner mismatch."
        : "Finish the Launchpad receipt verification harness.",
    };
  }
  if (id === "webhook_endpoint_verified") {
    const ok = webhookVerified(readiness);
    return {
      id, label: CHECKLIST_LABELS[id],
      status: ok ? "ready" : readiness.webhookConfigured ? "action_required" : "not_run",
      reason: ok ? "permitted" : readiness.deliveryFailureBlocker ? "webhook_failed" : "action_required",
      next_step: ok ? "Webhook test delivery verified HMAC. Re-fetch the public receipt before any grant." : ACTION_CONTROL_PLANE_CAPABILITY_META.webhooks.next_when_missing,
    };
  }
  if (id === "trading_preflight_tested") {
    const ok = activityMarksCapability(input.activity, "trading_venue");
    return {
      id, label: CHECKLIST_LABELS[id],
      status: ok ? "ready" : "not_run",
      reason: ok ? "permitted" : "not_run",
      next_step: ACTION_CONTROL_PLANE_CAPABILITY_META.trading_venue.next_when_missing,
    };
  }
  if (id === "payment_preflight_tested") {
    const ok = activityMarksCapability(input.activity, "payment_authorization");
    return {
      id, label: CHECKLIST_LABELS[id],
      status: ok ? "ready" : "not_run",
      reason: ok ? "permitted" : "not_run",
      next_step: ACTION_CONTROL_PLANE_CAPABILITY_META.payment_authorization.next_when_missing,
    };
  }
  if (id === "wallet_binding_tested") {
    const ok = activityMarksCapability(input.activity, "wallet_standard_binding");
    return {
      id, label: CHECKLIST_LABELS[id],
      status: ok ? "ready" : "optional",
      reason: ok ? "permitted" : "optional_not_required",
      next_step: ACTION_CONTROL_PLANE_CAPABILITY_META.wallet_standard_binding.next_when_missing,
    };
  }
  const production = productionState(input);
  return {
    id, label: CHECKLIST_LABELS[id],
    status: production.readiness,
    reason: production.reason,
    next_step: production.next_step,
  };
}

function rowState(item: { readiness?: ActionControlPlaneReadiness; status?: ActionControlPlaneReadiness }): ActionControlPlaneReadiness {
  return item.readiness ?? item.status ?? "not_run";
}

function overallReadiness(
  capabilities: ActionControlPlaneCapabilityView[],
  checklist: ActionControlPlaneChecklistItem[],
): ActionControlPlaneReadiness {
  const material = [
    ...capabilities.filter((item) => item.id !== "wallet_standard_binding"),
    ...checklist.filter((item) => item.id !== "wallet_binding_tested" && item.id !== "production_upgrade_readiness"),
  ];
  const states = material.map(rowState);
  if (states.includes("blocked")) return "blocked";
  if (states.includes("action_required") || states.includes("not_run")) return "action_required";
  return "ready";
}

export function buildActionControlPlaneView(input: ActionControlPlaneEvidence): ActionControlPlaneView {
  const capabilities = ACTION_CONTROL_PLANE_CAPABILITIES.map((id) => capabilityView(id, input));
  const checklist = ACTION_CONTROL_PLANE_CHECKLIST.map((id) => checklistItem(id, input));
  const lifecycle = buildActionControlPlaneLifecycle({
    activity: input.activity,
    webhookDeliveryStatus: input.readiness.latestDeliveryStatus,
    webhookFailure: input.readiness.deliveryFailureBlocker,
    policyVersionBlocked: input.readiness.policyChangeControl.status === "blocked"
      || Boolean(input.readiness.policyChangeControl.blockerCode),
  });
  const view: ActionControlPlaneView = {
    ok: true,
    version: ACTION_CONTROL_PLANE_VERSION,
    notice: ACTION_CONTROL_PLANE_NOT_PARALLEL,
    production_upgrade: ACTION_CONTROL_PLANE_PRODUCTION,
    action_authorization_rules: ACTION_AUTHORIZATION_CORE_RULES,
    application: {
      id: input.readiness.applicationId,
      public_slug: input.readiness.publicSlug,
      application_name: input.applicationName,
      environment: input.readiness.environment,
      status: input.readiness.status,
      policy_id: input.readiness.policyId,
      policy_version: input.readiness.policyVersion,
      policy_template_id: input.readiness.policyTemplateId,
    },
    capabilities,
    checklist,
    lifecycle,
    overall: overallReadiness(capabilities, checklist),
  };
  return sanitizeActionControlPlaneValue(view);
}
