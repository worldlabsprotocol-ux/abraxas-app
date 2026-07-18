// FILE: lib/partner/partnerOnboarding.ts
// Relying party onboarding checklist — tracked per partner org.

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
