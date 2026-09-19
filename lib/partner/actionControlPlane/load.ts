// FILE: lib/partner/actionControlPlane/load.ts
// Load control-plane evidence from existing Launchpad stores. Tenant-scoped.

import { createHash } from "crypto";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { collectSandboxReadinessEvidence } from "@/lib/partner/launchpad/sandboxReadiness/loadReport";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import { buildActionControlPlaneView, type ActionControlPlaneEvidence } from "./view";
import type { ActionControlPlaneActivityRow } from "./lifecycle";

function opaqueRequestRef(id: string): string {
  return `req_${createHash("sha256").update(id).digest("hex").slice(0, 12)}`;
}

export async function loadActionControlPlaneEvidence(input: {
  application: LaunchpadApplicationRow;
  partnerId: string;
}): Promise<ActionControlPlaneEvidence> {
  const readiness = await collectSandboxReadinessEvidence(input);
  const sb = requireSupabaseAdmin();
  const { data: activity } = await sb
    .from("partner_launchpad_activity")
    .select("id, event_type, public_code, metadata, created_at")
    .eq("application_id", input.application.id)
    .eq("partner_id", input.partnerId)
    .order("created_at", { ascending: false })
    .limit(100);

  const keyIds = [input.application.production_api_key_id].filter(Boolean) as string[];
  const { data: keys } = keyIds.length
    ? await sb.from("partner_api_keys").select("id, revoked_at").in("id", keyIds)
    : { data: [] as Array<{ id: string; revoked_at: string | null }> };
  const activeProductionKey = Boolean(
    input.application.production_api_key_id
    && (keys ?? []).some((key) => key.id === input.application.production_api_key_id && !key.revoked_at),
  );

  const { data: requests } = await sb
    .from("partner_production_access_requests")
    .select("id, status")
    .eq("application_id", input.application.id)
    .eq("partner_id", input.partnerId)
    .order("created_at", { ascending: false })
    .limit(1);

  const latest = requests?.[0];
  const productionStatus = latest?.status === "pending" || latest?.status === "approved" || latest?.status === "rejected"
    ? latest.status
    : "none";

  return {
    applicationName: input.application.application_name,
    readiness,
    activity: (activity ?? []) as ActionControlPlaneActivityRow[],
    productionAccess: {
      status: productionStatus,
      request_ref: latest?.id ? opaqueRequestRef(String(latest.id)) : null,
    },
    activeProductionKey,
  };
}

export async function buildActionControlPlaneForApplication(input: {
  application: LaunchpadApplicationRow;
  partnerId: string;
}) {
  const evidence = await loadActionControlPlaneEvidence(input);
  return buildActionControlPlaneView(evidence);
}
