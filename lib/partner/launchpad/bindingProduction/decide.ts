// FILE: lib/partner/launchpad/bindingProduction/decide.ts

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { BINDING_PRODUCTION_DECIDE_RPC, type BindingProductionStatus } from "./contract";

export async function decideBindingProduction(input: {
  decision: "approve" | "reject" | "suspend" | "reactivate";
  requestId?: string | null;
  bindingId?: string | null;
  reviewerId?: string | null;
  reviewerNotes?: string | null;
}): Promise<
  | { ok: true; code: string; binding_id: string; production_status: BindingProductionStatus; replay?: boolean }
  | { ok: false; code: string }
> {
  const sb = requireSupabaseAdmin();
  const { data, error } = await sb.rpc(BINDING_PRODUCTION_DECIDE_RPC, {
    p_decision: input.decision,
    p_request_id: input.requestId ?? null,
    p_binding_id: input.bindingId ?? null,
    p_reviewer_id: input.reviewerId ?? null,
    p_reviewer_notes: input.reviewerNotes ?? null,
  });

  if (error) return { ok: false, code: "binding_production_decide_failed" };

  const row = data as {
    ok?: boolean;
    code?: string;
    binding_id?: string;
    production_status?: BindingProductionStatus;
  };

  if (!row?.ok || !row.binding_id) {
    return { ok: false, code: row?.code ?? "binding_production_decide_failed" };
  }

  return {
    ok: true,
    code: row.code ?? input.decision,
    binding_id: row.binding_id,
    production_status: row.production_status ?? "sandbox_only",
    replay: row.code === "idempotency_replay",
  };
}
