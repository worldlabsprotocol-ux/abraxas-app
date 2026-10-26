// FILE: lib/decisionReceipts/currentValidity/applicationScope.server.ts
import "server-only";

import { evaluateApplicationScopeOnSovereignPg } from "@/lib/persistence/boundary/verticalSlice/applicationScopeRead";
import { getSovereignStagingPgPool } from "@/lib/persistence/boundary/sovereignStagingPg";
import { launchpadUsesSovereignPostgres } from "@/lib/partner/launchpad/launchpadPersistence";
import {
  deriveApplicationScopeFromAuthoritativeFacts,
  type ApplicationScopeEvaluation,
} from "./applicationScopeContract";

export type { ApplicationScopeEvaluation, ApplicationScopeResolver } from "./applicationScopeContract";

import type { ApplicationScopeResolver } from "./applicationScopeContract";

export function createOperationalApplicationScopeResolver(input?: {
  env?: Record<string, string | undefined>;
}): ApplicationScopeResolver {
  const env = input?.env;
  return async (scope) =>
    evaluateOperationalApplicationScope({
      receiptId: scope.receiptId,
      partnerId: scope.partnerId,
      applicationId: scope.applicationId,
      env,
    });
}

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
    const bound = app
      ? await pgGetSignedReceiptForApplication({
        applicationId,
        partnerId: input.partnerId,
        receiptId: input.receiptId,
      })
      : null;
    return deriveApplicationScopeFromAuthoritativeFacts({
      expectedApplicationId: applicationId,
      receiptPartnerId: input.partnerId,
      store_available: true,
      facts: {
        application_row_present: Boolean(app),
        application_partner_id: app?.partner_id ?? null,
        application_status: app?.status ?? null,
        binding_row_present: Boolean(bound),
        binding_application_id: bound ? applicationId : null,
        binding_partner_id: bound ? input.partnerId : null,
        binding_revoked_at: bound?.revoked_at ?? null,
      },
    });
  }

  try {
    const { getLaunchpadApplicationForPartner } = await import(
      "@/lib/partner/launchpad/resolveLaunchpadApplication.server"
    );
    const app = await getLaunchpadApplicationForPartner(applicationId, input.partnerId);
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
    return deriveApplicationScopeFromAuthoritativeFacts({
      expectedApplicationId: applicationId,
      receiptPartnerId: input.partnerId,
      store_available: true,
      facts: {
        application_row_present: Boolean(app),
        application_partner_id: app?.partner_id ?? null,
        application_status: app?.status ?? null,
        binding_row_present: Boolean(data),
        binding_application_id: data ? String(data.application_id) : null,
        binding_partner_id: data ? String(data.partner_id) : null,
        binding_revoked_at: data?.revoked_at ? String(data.revoked_at) : null,
      },
    });
  } catch {
    return {
      store_available: false,
      application_scope_satisfied: false,
      reasons: ["validity_store_unavailable"],
    };
  }
}
