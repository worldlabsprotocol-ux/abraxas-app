// FILE: lib/decisionReceipts/currentValidity/applicationScope.ts
// Application scope for operational current-validity (sovereign PG or Launchpad store).

import { evaluateApplicationScopeOnSovereignPg } from "@/lib/persistence/boundary/verticalSlice/applicationScopeRead";
import { getSovereignStagingPgPool } from "@/lib/persistence/boundary/sovereignStagingPg";
import { launchpadUsesSovereignPostgres } from "@/lib/partner/launchpad/launchpadPersistence";

export type ApplicationScopeEvaluation = {
  store_available: boolean;
  application_scope_satisfied: boolean;
  reasons: string[];
};

export async function evaluateOperationalApplicationScope(input: {
  receiptId: string;
  partnerId: string;
  applicationId?: string | null;
  env?: Record<string, string | undefined>;
}): Promise<ApplicationScopeEvaluation> {
  const applicationId = input.applicationId?.trim() ?? "";
  if (!applicationId) {
    return { store_available: true, application_scope_satisfied: true, reasons: [] };
  }

  const env = input.env ?? process.env;
  if (getSovereignStagingPgPool(env)) {
    const sovereign = await evaluateApplicationScopeOnSovereignPg({
      receiptId: input.receiptId,
      partnerId: input.partnerId,
      expectedApplicationId: applicationId,
      env,
    });
    return {
      store_available: sovereign.store_available,
      application_scope_satisfied: sovereign.application_scope_satisfied,
      reasons: sovereign.reasons,
    };
  }

  if (launchpadUsesSovereignPostgres()) {
    const { pgGetSignedReceiptForApplication } = await import(
      "@/lib/partner/launchpad/sovereign/launchpadPgStore"
    );
    const { getLaunchpadApplicationForPartner } = await import(
      "@/lib/partner/launchpad/resolveLaunchpadApplication.server"
    );
    const app = await getLaunchpadApplicationForPartner(applicationId, input.partnerId);
    if (!app) {
      return {
        store_available: true,
        application_scope_satisfied: false,
        reasons: ["application_unbound"],
      };
    }
    if (app.status !== "active") {
      return {
        store_available: true,
        application_scope_satisfied: false,
        reasons: ["application_inactive"],
      };
    }
    const bound = await pgGetSignedReceiptForApplication({
      applicationId,
      partnerId: input.partnerId,
      receiptId: input.receiptId,
    });
    if (!bound) {
      return {
        store_available: true,
        application_scope_satisfied: false,
        reasons: ["application_unbound"],
      };
    }
    if (bound.revoked_at) {
      return {
        store_available: true,
        application_scope_satisfied: false,
        reasons: ["application_inactive"],
      };
    }
    return { store_available: true, application_scope_satisfied: true, reasons: [] };
  }

  try {
    const { getLaunchpadApplicationForPartner } = await import(
      "@/lib/partner/launchpad/resolveLaunchpadApplication.server"
    );
    const app = await getLaunchpadApplicationForPartner(applicationId, input.partnerId);
    if (!app || app.status !== "active") {
      return {
        store_available: true,
        application_scope_satisfied: false,
        reasons: [app ? "application_inactive" : "application_unbound"],
      };
    }
    const { requireSupabaseAdmin } = await import("@/lib/supabase/admin");
    const sb = requireSupabaseAdmin();
    const { data, error } = await sb
      .from("partner_launchpad_signed_receipts")
      .select("application_id, partner_id, revoked_at")
      .eq("receipt_id", input.receiptId)
      .maybeSingle();
    if (error) {
      return {
        store_available: false,
        application_scope_satisfied: false,
        reasons: ["validity_store_unavailable"],
      };
    }
    if (!data) {
      return {
        store_available: true,
        application_scope_satisfied: false,
        reasons: ["application_unbound"],
      };
    }
    if (
      String(data.partner_id) !== input.partnerId
      || String(data.application_id) !== applicationId
    ) {
      return {
        store_available: true,
        application_scope_satisfied: false,
        reasons: ["application_mismatch"],
      };
    }
    if (data.revoked_at) {
      return {
        store_available: true,
        application_scope_satisfied: false,
        reasons: ["application_inactive"],
      };
    }
    return { store_available: true, application_scope_satisfied: true, reasons: [] };
  } catch {
    return {
      store_available: false,
      application_scope_satisfied: false,
      reasons: ["validity_store_unavailable"],
    };
  }
}
