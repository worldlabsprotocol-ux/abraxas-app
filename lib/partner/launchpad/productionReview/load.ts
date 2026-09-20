// FILE: lib/partner/launchpad/productionReview/load.ts
// Load pending Production-review queue items from existing Launchpad records.

import { requireSupabaseAdmin, SupabaseAdminConfigurationError } from "@/lib/supabase/admin";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { loadGoLiveEvidence } from "@/lib/partner/launchpad/goLiveReadiness/load";
import { probePolicyChangeControlSchema } from "@/lib/policy/changeControl/schemaReady";
import { evaluateProductionReviewGates } from "./evaluate";
import { productionReviewLeaks, productionReviewPublicEnvelope, toProductionReviewQueueItem } from "./snapshot";

async function durableSchemaReady(): Promise<boolean> {
  const sb = requireSupabaseAdmin();
  const [requests, activity, policy] = await Promise.all([
    sb.from("partner_production_access_requests").select("id", { head: true, count: "exact" }).limit(0),
    sb.from("partner_launchpad_activity").select("id", { head: true, count: "exact" }).limit(0),
    probePolicyChangeControlSchema(sb),
  ]);
  return !requests.error && !activity.error && policy.ready;
}

export async function loadProductionReviewQueue(status = "pending") {
  try {
    const sb = requireSupabaseAdmin();
    const schemaReady = await durableSchemaReady();
    const { data, error } = await sb
      .from("partner_production_access_requests")
      .select("id, application_id, partner_id, status, request_notes, created_at, reviewed_at")
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return { ok: false as const, code: "production_review_store_unavailable" };
    const items = [];
    for (const row of data ?? []) {
      const application = await getLaunchpadApplicationForPartner(row.application_id, row.partner_id);
      if (!application) continue;
      const evidence = await loadGoLiveEvidence({ application, partnerId: row.partner_id });
      const gates = evaluateProductionReviewGates({
        request: row,
        application,
        evidence,
        durableSchemaReady: schemaReady,
      });
      items.push(toProductionReviewQueueItem({
        requestId: row.id,
        status: row.status,
        createdAt: String(row.created_at),
        note: row.request_notes,
        application,
        evidence,
        gates,
      }));
    }
    const envelope = productionReviewPublicEnvelope(items);
    if (productionReviewLeaks(envelope).length > 0) {
      return { ok: false as const, code: "production_review_store_unavailable" };
    }
    return { ok: true as const, ...envelope };
  } catch (error) {
    if (error instanceof SupabaseAdminConfigurationError) {
      return { ok: false as const, code: "production_review_store_unavailable" };
    }
    return { ok: false as const, code: "production_review_store_unavailable" };
  }
}
