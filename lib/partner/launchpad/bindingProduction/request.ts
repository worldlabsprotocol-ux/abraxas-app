// FILE: lib/partner/launchpad/bindingProduction/request.ts

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import {
  listApplicationPolicyBindings,
  bindingsSchemaReady,
} from "@/lib/partner/launchpad/applicationPolicyBindings";
import { loadGoLiveEvidence } from "@/lib/partner/launchpad/goLiveReadiness/load";
import { loadIntegrationEvents } from "@/lib/partner/pilotEvidence/load";
import { BINDING_PRODUCTION_REQUEST_RPC, type BindingProductionStatus } from "./contract";
import { evaluateBindingProductionReadiness } from "./evaluate";

export async function requestBindingProduction(input: {
  applicationId: string;
  partnerId: string;
  bindingId: string;
  note?: string | null;
}): Promise<
  | { ok: true; replay: boolean; request_id: string; binding_id: string; production_status: BindingProductionStatus }
  | { ok: false; code: string }
> {
  if (!await bindingsSchemaReady()) {
    return { ok: false, code: "bindings_schema_unavailable" };
  }

  const application = await getLaunchpadApplicationForPartner(input.applicationId, input.partnerId);
  if (!application) return { ok: false, code: "application_not_found" };

  const bindings = await listApplicationPolicyBindings(application);
  const binding = bindings.find((b) => b.id === input.bindingId);
  if (!binding) return { ok: false, code: "binding_not_found" };

  const productionStatus = ((binding as ApplicationPolicyBindingRowExt).production_status ?? "sandbox_only") as BindingProductionStatus;

  const sb = requireSupabaseAdmin();
  const { data: pending } = await sb
    .from("partner_binding_production_access_requests")
    .select("id")
    .eq("binding_id", input.bindingId)
    .eq("status", "pending")
    .maybeSingle();

  const evidence = await loadGoLiveEvidence({ application, partnerId: input.partnerId });
  const events = await loadIntegrationEvents({ partnerId: input.partnerId, applicationId: application.id });
  const scoped = events.filter((e) => e.policy_id === binding.policy_id);
  const readiness = evaluateBindingProductionReadiness({
    application,
    binding,
    evidence,
    productionStatus,
    hasPendingRequest: Boolean(pending),
    policyEventsForBinding: {
      verified_receipts: scoped.filter((e) => e.event_type === "receipt_verification_succeeded").length,
      request_volume: scoped.filter((e) => e.event_type === "verification_request_created").length,
    },
  });

  if (!readiness.ok && !pending) {
    return { ok: false, code: readiness.blockers[0] ?? "binding_production_not_ready" };
  }

  const { data, error } = await sb.rpc(BINDING_PRODUCTION_REQUEST_RPC, {
    p_binding_id: input.bindingId,
    p_application_id: input.applicationId,
    p_partner_id: input.partnerId,
    p_request_notes: input.note ?? null,
  });

  if (error) {
    return { ok: false, code: "binding_production_request_failed" };
  }

  const row = data as {
    ok?: boolean;
    code?: string;
    request_id?: string;
    binding_id?: string;
    production_status?: BindingProductionStatus;
  };

  if (!row?.ok || !row.request_id || !row.binding_id) {
    return { ok: false, code: row?.code ?? "binding_production_request_failed" };
  }

  return {
    ok: true,
    replay: row.code === "idempotency_replay",
    request_id: row.request_id,
    binding_id: row.binding_id,
    production_status: row.production_status ?? "production_requested",
  };
}

interface ApplicationPolicyBindingRowExt {
  production_status?: BindingProductionStatus;
}
