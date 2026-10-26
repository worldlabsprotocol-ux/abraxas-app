// FILE: lib/persistence/boundary/verticalSlice/applicationScopeRead.ts
// Launchpad application scope on sovereign PG — authoritative binding, not caller-supplied proof.

import { querySovereignStagingPg } from "../sovereignStagingPg";

export type SovereignApplicationScopeEvaluation = {
  scope_required: boolean;
  store_available: boolean;
  application_scope_satisfied: boolean;
  reasons: string[];
};

type ApplicationRow = { status: string; partner_id: string };
type BindingRow = { application_id: string; partner_id: string; revoked_at: string | null };

export async function evaluateApplicationScopeOnSovereignPg(input: {
  receiptId: string;
  partnerId: string;
  expectedApplicationId?: string | null;
  env?: Record<string, string | undefined>;
}): Promise<SovereignApplicationScopeEvaluation> {
  const expected = input.expectedApplicationId?.trim() ?? "";
  if (!expected) {
    return {
      scope_required: false,
      store_available: true,
      application_scope_satisfied: true,
      reasons: [],
    };
  }

  const env = input.env ?? process.env;
  const reasons: string[] = [];

  const appResult = await querySovereignStagingPg<ApplicationRow>(
    `select status, partner_id from public.partner_launchpad_applications
      where id = $1::uuid limit 1`,
    [expected],
    env,
  );
  if ("error" in appResult) {
    return {
      scope_required: true,
      store_available: false,
      application_scope_satisfied: false,
      reasons: ["validity_store_unavailable"],
    };
  }

  const appRow = appResult.rows[0];
  if (!appRow) {
    reasons.push("application_unbound");
    return {
      scope_required: true,
      store_available: true,
      application_scope_satisfied: false,
      reasons,
    };
  }

  if (appRow.partner_id !== input.partnerId) {
    reasons.push("application_mismatch");
    return {
      scope_required: true,
      store_available: true,
      application_scope_satisfied: false,
      reasons,
    };
  }

  if (appRow.status !== "active") {
    reasons.push("application_inactive");
  }

  const bindingResult = await querySovereignStagingPg<BindingRow>(
    `select application_id, partner_id, revoked_at from public.partner_launchpad_signed_receipts
      where receipt_id = $1 limit 1`,
    [input.receiptId],
    env,
  );
  if ("error" in bindingResult) {
    return {
      scope_required: true,
      store_available: false,
      application_scope_satisfied: false,
      reasons: ["validity_store_unavailable"],
    };
  }

  const binding = bindingResult.rows[0];
  if (!binding) {
    reasons.push("application_unbound");
  } else {
    if (binding.partner_id !== input.partnerId) {
      reasons.push("application_mismatch");
    } else if (String(binding.application_id) !== expected) {
      reasons.push("application_mismatch");
    } else if (binding.revoked_at) {
      reasons.push("application_inactive");
    }
  }

  const application_scope_satisfied = reasons.length === 0;
  return {
    scope_required: true,
    store_available: true,
    application_scope_satisfied,
    reasons,
  };
}
