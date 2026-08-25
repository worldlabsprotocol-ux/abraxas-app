// FILE: lib/partner/partnerOnboarding.ts
// Relying party onboarding checklist — tracked per partner org.

import type { PartnerDashboardReadiness } from "@/lib/partner/partnerPortalReadiness";

export const RP_ONBOARDING_STEPS = [
  {
    id: "key_issued",
    title: "API key issued",
    description: "Receive abx_test_ sandbox key after application approval.",
  },
  {
    id: "first_api_call",
    title: "First API call",
    description: "Server-side POST /api/credentials/verify or GET /api/verify/registry from your backend.",
  },
  {
    id: "sandbox_approved",
    title: "Sandbox verify approved",
    description: "At least one decision: approved against a test record in sandbox.",
  },
  {
    id: "production_key",
    title: "Production key issued",
    description: "abx_live_ key after pilot criteria met and agreement signed.",
  },
  {
    id: "production_approved",
    title: "Production verify approved",
    description: "First approved production verify — counts toward mainnet gate #5.",
  },
] as const;

export type RpOnboardingStepId = (typeof RP_ONBOARDING_STEPS)[number]["id"];

export interface RpOnboardingProgress {
  steps: Array<{
    id: RpOnboardingStepId;
    title: string;
    description: string;
    done: boolean;
  }>;
  completed: number;
  total: number;
  productionGateEligible: boolean;
}

export function computeOnboardingProgress(input: {
  hasKey: boolean;
  keyPrefix: string;
  calls30d: number;
  approvedDecisions: number;
  checklistOverride?: Partial<Record<RpOnboardingStepId, boolean>>;
}): RpOnboardingProgress {
  const isLive = input.keyPrefix.startsWith("abx_live_");
  const done: Record<RpOnboardingStepId, boolean> = {
    key_issued: input.hasKey,
    first_api_call: input.calls30d > 0,
    sandbox_approved: input.approvedDecisions > 0,
    production_key: isLive,
    production_approved: isLive && input.approvedDecisions > 0,
    ...input.checklistOverride,
  };

  const steps = RP_ONBOARDING_STEPS.map(step => ({
    ...step,
    done: done[step.id],
  }));

  const completed = steps.filter(s => s.done).length;

  return {
    steps,
    completed,
    total: steps.length,
    productionGateEligible: done.production_approved,
  };
}

export function slugifyPartnerId(company: string): string {
  const slug = company
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "partner";
}

export const PARTNER_FLOW_PORTAL_STEPS = [
  {
    id: "key_authenticated",
    title: "API key authenticated",
    description: "You are signed in with your issued abx_test_ or abx_live_ key.",
  },
  {
    id: "partner_row_ready",
    title: "Partner row provisioned",
    description: "Abraxas ops created your external design partner row.",
  },
  {
    id: "assigned_policy_configured",
    title: "Sandbox policy assigned",
    description: "Abraxas ops bound an assigned sandbox policy family to your partner row.",
  },
  {
    id: "sandbox_policy_active",
    title: "Active sandbox policy published",
    description: "Exactly one active version of your assigned policy has sandbox_only: true.",
  },
  {
    id: "callback_allowlist_configured",
    title: "Callback allowlist configured",
    description: "Abraxas ops allowlisted your HTTPS callback. They supply the exact return_url out-of-band.",
  },
  {
    id: "partner_flow_config_ready",
    title: "Ready to start Partner Flow test",
    description: "Operator provisioning is complete. This does not mean a holder flow succeeded.",
  },
  {
    id: "callback_handler",
    title: "Callback handler implemented",
    description: "Your server fetches GET /api/receipts/{receipt_id}/public before granting access.",
  },
  {
    id: "sandbox_receipt_validated",
    title: "Sandbox receipt validated",
    description: "You confirmed signature_valid and matching partner_id/policy_id on a sandbox receipt.",
  },
] as const;

export type PartnerFlowPortalStepId = (typeof PARTNER_FLOW_PORTAL_STEPS)[number]["id"];

export interface PartnerFlowPortalOnboardingProgress {
  steps: Array<{
    id: PartnerFlowPortalStepId;
    title: string;
    description: string;
    done: boolean;
  }>;
  completed: number;
  total: number;
}

const MANUAL_PORTAL_STEP_IDS = new Set<PartnerFlowPortalStepId>([
  "callback_handler",
  "sandbox_receipt_validated",
]);

export function computePartnerFlowPortalOnboarding(
  readiness: PartnerDashboardReadiness,
): PartnerFlowPortalOnboardingProgress {
  const done: Record<PartnerFlowPortalStepId, boolean> = {
    key_authenticated: true,
    partner_row_ready: readiness.partner_row_ready,
    assigned_policy_configured: readiness.assigned_policy_configured,
    sandbox_policy_active: readiness.active_sandbox_policy_ready,
    callback_allowlist_configured: readiness.callback_allowlist_configured,
    partner_flow_config_ready: readiness.partner_flow_config_ready,
    callback_handler: false,
    sandbox_receipt_validated: false,
  };

  const steps = PARTNER_FLOW_PORTAL_STEPS.map((step) => ({
    ...step,
    done: MANUAL_PORTAL_STEP_IDS.has(step.id) ? false : done[step.id],
  }));

  const completed = steps.filter((step) => step.done).length;

  return {
    steps,
    completed,
    total: steps.length,
  };
}
