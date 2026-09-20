// FILE: lib/partner/launchpad/goLiveReadiness/submit.ts
// Create or replay a reviewed Production-access request. Never activates Production.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { recordLaunchpadActivity } from "@/lib/partner/launchpad/recordActivity";
import { callbackHostClass, type GoLiveReadinessView } from "./evaluate";
import type { GoLiveEvidence } from "./evaluate";

export async function submitGoLiveReviewRequest(input: {
  evidence: GoLiveEvidence;
  view: GoLiveReadinessView;
  note: string | null;
}): Promise<
  | { ok: true; replay: boolean; request: NonNullable<GoLiveReadinessView["request"]> }
  | { ok: false; code: "go_live_not_ready" | "go_live_request_failed" }
> {
  if (input.evidence.request && (input.evidence.request.status === "pending" || input.evidence.request.status === "approved")) {
    return { ok: true, replay: true, request: input.evidence.request };
  }
  if (!input.view.can_request_review) {
    return { ok: false, code: "go_live_not_ready" };
  }

  const sb = requireSupabaseAdmin();
  const { data, error } = await sb
    .from("partner_production_access_requests")
    .insert({
      application_id: input.evidence.applicationId,
      partner_id: input.evidence.partnerId,
      request_notes: input.note,
      status: "pending",
    })
    .select("id, status, created_at, reviewed_at")
    .single();

  if (error || !data) {
    return { ok: false, code: "go_live_request_failed" };
  }

  await recordLaunchpadActivity(sb, {
    applicationId: input.evidence.applicationId,
    partnerId: input.evidence.partnerId,
    eventType: "production_access_requested",
    publicCode: "review_requested",
    metadata: {
      policy_id: input.view.policy_id,
      policy_version: input.view.policy_version,
      capabilities: input.view.selected_capabilities.join(","),
      readiness_class: input.view.lifecycle,
      callback_class: callbackHostClass(input.evidence.allowedReturnUrls),
      kit_evidenced: input.evidence.starterKitEvidenced,
      sandbox_key_configured: input.evidence.activeSandboxKey,
    },
  });

  return {
    ok: true,
    replay: false,
    request: {
      id: String(data.id),
      status: "pending",
      created_at: String(data.created_at),
      reviewed_at: data.reviewed_at ? String(data.reviewed_at) : null,
    },
  };
}
