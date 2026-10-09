// FILE: lib/partner/launchpad/productionActivation/resolveReceiptDecisionContext.ts
// Application-scoped production usability without mutating global policy packs.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";

export type ReceiptDecisionContext = "sandbox_only" | "production";

export async function resolveReceiptDecisionContext(input: {
  policySandboxOnly: boolean;
  launchpadApplicationId?: string | null;
}): Promise<ReceiptDecisionContext> {
  const appId = input.launchpadApplicationId?.trim();
  if (appId) {
    try {
      const sb = requireSupabaseAdmin();
      const { data } = await sb
        .from("partner_launchpad_applications")
        .select("production_activated_at, environment, status")
        .eq("id", appId)
        .maybeSingle();
      if (
        data?.production_activated_at
        && data.environment === "production"
        && data.status === "active"
      ) {
        return "production";
      }
      if (data?.environment === "sandbox") {
        return "sandbox_only";
      }
    } catch {
      // Fail closed to policy default when store is unavailable.
    }
  }
  return input.policySandboxOnly ? "sandbox_only" : "production";
}

/** Hosted handoff environment is authoritative for receipt trust labeling. */
export function resolveHostedHandoffReceiptDecisionContext(input: {
  handoffEnvironment: "sandbox" | "production";
  policySandboxOnly: boolean;
  launchpadApplicationId?: string | null;
}): Promise<ReceiptDecisionContext> {
  if (input.handoffEnvironment === "sandbox") {
    return Promise.resolve("sandbox_only");
  }
  return resolveReceiptDecisionContext({
    policySandboxOnly: input.policySandboxOnly,
    launchpadApplicationId: input.launchpadApplicationId,
  });
}

export function isApplicationProductionUsable(input: {
  productionActivatedAt: string | null;
  environment: string;
  status: string;
}): boolean {
  return Boolean(
    input.productionActivatedAt
    && input.environment === "production"
    && input.status === "active",
  );
}
