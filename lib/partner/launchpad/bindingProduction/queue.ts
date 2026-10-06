// FILE: lib/partner/launchpad/bindingProduction/queue.ts

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { resolvePolicyPack } from "@/lib/partner/launchpad/policyPacks";
import { loadGoLiveEvidence } from "@/lib/partner/launchpad/goLiveReadiness/load";
import { loadIntegrationEvents } from "@/lib/partner/pilotEvidence/load";
import { evaluateBindingProductionReadiness } from "./evaluate";
import type { BindingProductionRequestRow } from "./contract";

export interface BindingProductionQueueItem {
  request_id: string;
  binding_id: string;
  app_label: string;
  partner_id: string;
  application_id: string;
  policy_id: string;
  policy_version: number;
  pack_id: string;
  result_family: string;
  binding_role: string;
  production_status: string;
  submitted_note: string | null;
  submitted_at: string;
  decision_status: string;
  verified_receipts: number;
  request_volume: number;
  blockers: string[];
}

export async function loadBindingProductionQueue(
  status: "pending" | "approved" | "rejected" = "pending",
): Promise<{ ok: true; items: BindingProductionQueueItem[] } | { ok: false; code: string }> {
  try {
    const sb = requireSupabaseAdmin();
    const { data, error } = await sb
      .from("partner_binding_production_access_requests")
      .select("*")
      .eq("status", status)
      .order("created_at", { ascending: false });
    if (error) return { ok: false, code: "binding_production_store_unavailable" };

    const items: BindingProductionQueueItem[] = [];
    for (const row of (data ?? []) as BindingProductionRequestRow[]) {
      const application = await getLaunchpadApplicationForPartner(row.application_id, row.partner_id);
      if (!application) continue;
      const evidence = await loadGoLiveEvidence({ application, partnerId: row.partner_id });
      const events = await loadIntegrationEvents({ partnerId: row.partner_id, applicationId: row.application_id });
      const scoped = events.filter((e) => e.policy_id === row.policy_id);
      const pack = resolvePolicyPack(row.policy_template_id);
      const { data: bindingRow } = await sb
        .from("partner_launchpad_application_policies")
        .select("production_status, binding_role, status")
        .eq("id", row.binding_id)
        .maybeSingle();

      const readiness = evaluateBindingProductionReadiness({
        application,
        binding: {
          id: row.binding_id,
          application_id: row.application_id,
          partner_id: row.partner_id,
          policy_id: row.policy_id,
          policy_version: row.policy_version,
          policy_template_id: row.policy_template_id,
          binding_role: (bindingRow?.binding_role as "secondary") ?? "secondary",
          status: (bindingRow?.status as "active") ?? "active",
          sandbox_configured_at: row.created_at,
          production_authorized_at: null,
        },
        evidence,
        productionStatus: (bindingRow?.production_status as import("./contract").BindingProductionStatus) ?? "production_requested",
        hasPendingRequest: status === "pending",
        policyEventsForBinding: {
          verified_receipts: scoped.filter((e) => e.event_type === "receipt_verification_succeeded").length,
          request_volume: scoped.filter((e) => e.event_type === "verification_request_created").length,
        },
      });

      items.push({
        request_id: row.id,
        binding_id: row.binding_id,
        app_label: application.display_name || application.application_name || application.public_slug,
        partner_id: row.partner_id,
        application_id: row.application_id,
        policy_id: row.policy_id,
        policy_version: row.policy_version,
        pack_id: row.policy_template_id,
        result_family: pack?.disclosed_result ?? row.policy_template_id,
        binding_role: String(bindingRow?.binding_role ?? "secondary"),
        production_status: String(bindingRow?.production_status ?? "production_requested"),
        submitted_note: row.request_notes,
        submitted_at: row.created_at,
        decision_status: row.status,
        verified_receipts: scoped.filter((e) => e.event_type === "receipt_verification_succeeded").length,
        request_volume: scoped.filter((e) => e.event_type === "verification_request_created").length,
        blockers: readiness.blockers,
      });
    }
    return { ok: true, items };
  } catch {
    return { ok: false, code: "binding_production_store_unavailable" };
  }
}
