// FILE: lib/partner/launchpad/goLiveReadiness/load.ts
// Assemble go-live evidence from existing Launchpad rows. No parallel store.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { collectSandboxReadinessEvidence } from "@/lib/partner/launchpad/sandboxReadiness";
import type { LaunchpadApplicationRow, ProductionAccessRequestStatus } from "@/lib/partner/launchpad/types";
import type { GoLiveEvidence } from "./evaluate";

function starterKitFromActivity(
  rows: Array<{ public_code: string | null; metadata?: Record<string, unknown> }>,
): { evidenced: boolean; runtime: string | null } {
  for (const row of rows) {
    const code = row.public_code ?? "";
    const meta = row.metadata ?? {};
    if (code === "starter_kit_generated" || code === "starter_kit_downloaded" || meta.starter_kit === true) {
      return {
        evidenced: true,
        runtime: typeof meta.runtime === "string" ? meta.runtime : null,
      };
    }
  }
  return { evidenced: false, runtime: null };
}

export async function loadGoLiveEvidence(input: {
  application: LaunchpadApplicationRow;
  partnerId: string;
}): Promise<GoLiveEvidence> {
  const evidence = await collectSandboxReadinessEvidence({
    application: input.application,
    partnerId: input.partnerId,
  });
  const sb = requireSupabaseAdmin();
  const { data: requests } = await sb
    .from("partner_production_access_requests")
    .select("id, status, created_at, reviewed_at")
    .eq("application_id", input.application.id)
    .eq("partner_id", input.partnerId)
    .order("created_at", { ascending: false })
    .limit(1);
  const { data: activity } = await sb
    .from("partner_launchpad_activity")
    .select("public_code, metadata")
    .eq("application_id", input.application.id)
    .eq("partner_id", input.partnerId)
    .order("created_at", { ascending: false })
    .limit(80);
  const kit = starterKitFromActivity((activity ?? []) as Array<{ public_code: string | null; metadata?: Record<string, unknown> }>);
  const latest = (requests ?? [])[0] as {
    id: string;
    status: ProductionAccessRequestStatus;
    created_at: string;
    reviewed_at: string | null;
  } | undefined;

  return {
    applicationId: input.application.id,
    partnerId: input.partnerId,
    status: evidence.status,
    environment: evidence.environment,
    policyId: evidence.policyId,
    policyVersion: evidence.policyVersion,
    policyTemplateId: evidence.policyTemplateId,
    allowedReturnUrls: evidence.allowedReturnUrls,
    activeSandboxKey: evidence.activeSandboxKey,
    webhookConfigured: evidence.webhookConfigured,
    webhookEnabled: evidence.webhookEnabled,
    latestDeliveryStatus: evidence.latestDeliveryStatus,
    verifiedHostnames: evidence.verifiedHostnames,
    starterKitEvidenced: kit.evidenced,
    starterKitRuntime: kit.runtime,
    request: latest
      ? {
          id: latest.id,
          status: latest.status,
          created_at: latest.created_at,
          reviewed_at: latest.reviewed_at,
        }
      : null,
  };
}
