// FILE: lib/partner/launchpad/productionReview/decide.ts
// Approve or reject a pending Production-access request. Never issues keys or activates Mainnet.

import { requireSupabaseAdmin, SupabaseAdminConfigurationError } from "@/lib/supabase/admin";
import { recordLaunchpadActivity } from "@/lib/partner/launchpad/recordActivity";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { loadGoLiveEvidence } from "@/lib/partner/launchpad/goLiveReadiness/load";
import { probePolicyChangeControlSchema } from "@/lib/policy/changeControl/schemaReady";
import {
  partnerRemediationForBlocker,
  PRODUCTION_REVIEW_PARTNER_REMEDIATION,
  type ProductionReviewDecision,
  type ProductionReviewRemediation,
} from "./contract";
import { activateProductionApplication } from "@/lib/partner/launchpad/productionActivation";
import { evaluateProductionReviewGates } from "./evaluate";
import { productionReviewLeaks, toProductionReviewQueueItem } from "./snapshot";

export interface ProductionReviewDecisionResult {
  ok: boolean;
  decision?: "approved" | "rejected";
  replay?: boolean;
  request_id?: string;
  application_id?: string;
  issues_production_key: false;
  activates_mainnet: false;
  executes: false;
  remediation_class?: ProductionReviewRemediation;
  code?: string;
  item?: ReturnType<typeof toProductionReviewQueueItem>;
}

async function durableSchemaReady(): Promise<boolean> {
  try {
    const sb = requireSupabaseAdmin();
    const [requests, activity, policy] = await Promise.all([
      sb.from("partner_production_access_requests").select("id", { head: true, count: "exact" }).limit(0),
      sb.from("partner_launchpad_activity").select("id", { head: true, count: "exact" }).limit(0),
      probePolicyChangeControlSchema(sb),
    ]);
    return !requests.error && !activity.error && policy.ready;
  } catch {
    return false;
  }
}

export async function decideProductionReview(input: {
  requestId: string;
  decision: ProductionReviewDecision;
  confirm: boolean;
  remediationClass?: string | null;
}): Promise<ProductionReviewDecisionResult> {
  const none = { issues_production_key: false as const, activates_mainnet: false as const, executes: false as const };
  if (!input.confirm) {
    return { ok: false, code: "invalid_input", ...none };
  }
  try {
    const sb = requireSupabaseAdmin();
    const { data: request, error } = await sb
      .from("partner_production_access_requests")
      .select("id, application_id, partner_id, status, request_notes, created_at, reviewed_at")
      .eq("id", input.requestId)
      .maybeSingle();
    if (error) return { ok: false, code: "production_review_store_unavailable", ...none };
    if (!request) return { ok: false, code: "not_found", ...none };

    if (request.status === "approved" && input.decision === "approve") {
      const replay = await activateProductionApplication({
        requestId: request.id,
        confirm: true,
      });
      if (!replay.ok && replay.code !== "production_activation_not_ready") {
        return { ok: false, code: replay.code ?? "production_activation_store_unavailable", ...none };
      }
      return {
        ok: true,
        decision: "approved",
        replay: true,
        request_id: request.id,
        application_id: request.application_id,
        ...none,
      };
    }
    if (request.status === "rejected" && input.decision === "reject") {
      return { ok: true, decision: "rejected", replay: true, request_id: request.id, application_id: request.application_id, ...none };
    }
    if (request.status !== "pending") {
      return {
        ok: false,
        code: "production_review_not_pending",
        remediation_class: "resubmit_after_rejection",
        ...none,
      };
    }

    const application = await getLaunchpadApplicationForPartner(request.application_id, request.partner_id);
    if (!application) return { ok: false, code: "not_found", ...none };
    const evidence = await loadGoLiveEvidence({ application, partnerId: request.partner_id });
    const schemaReady = await durableSchemaReady();
    const gates = evaluateProductionReviewGates({
      request,
      application,
      evidence,
      durableSchemaReady: schemaReady,
    });

    if (input.decision === "approve" && !gates.ok) {
      const blocker = gates.blockers[0] ?? "readiness_incomplete";
      return {
        ok: false,
        code: "production_review_not_ready",
        remediation_class: partnerRemediationForBlocker(blocker),
        ...none,
      };
    }

    const partnerRemediation = input.decision === "reject"
      ? ((PRODUCTION_REVIEW_PARTNER_REMEDIATION as readonly string[]).includes(String(input.remediationClass ?? ""))
        ? input.remediationClass as ProductionReviewRemediation
        : "resubmit_after_rejection")
      : undefined;

    if (input.decision === "approve") {
      const activated = await activateProductionApplication({
        requestId: request.id,
        reviewerNotes: partnerRemediation ?? "production_activated",
        confirm: true,
      });
      if (!activated.ok) {
        return {
          ok: false,
          code: activated.code ?? "production_activation_store_unavailable",
          remediation_class: activated.code === "production_activation_not_ready"
            ? partnerRemediationForBlocker(gates.blockers[0] ?? "readiness_incomplete")
            : undefined,
          ...none,
        };
      }
      await recordLaunchpadActivity(sb, {
        applicationId: application.id,
        partnerId: request.partner_id,
        eventType: "production_review_approved",
        publicCode: "production_review_approved",
        metadata: {
          request_id: request.id,
          readiness_class: gates.readiness_class,
          reason_class: "production_activated",
          issues_production_key: activated.issues_production_key,
          activates_production: true,
          policy_id: activated.policy_id ?? application.policy_id,
          policy_version: activated.policy_version ?? application.policy_version,
          api_key_id: activated.api_key_id ?? null,
          idempotency_replay: activated.idempotency_replay ?? false,
        },
      });
    } else {
      const { error: updateError } = await sb
        .from("partner_production_access_requests")
        .update({
          status: "rejected",
          reviewer_notes: partnerRemediation ?? "review_rejected",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", request.id)
        .eq("status", "pending");
      if (updateError) return { ok: false, code: "production_review_store_unavailable", ...none };

      await recordLaunchpadActivity(sb, {
        applicationId: application.id,
        partnerId: request.partner_id,
        eventType: "production_review_rejected",
        publicCode: "production_review_rejected",
        metadata: {
          request_id: request.id,
          readiness_class: gates.readiness_class,
          reason_class: partnerRemediation ?? "review_rejected",
          issues_production_key: false,
          activates_production: false,
          policy_id: application.policy_id,
          policy_version: application.policy_version,
        },
      });
    }

    const nextStatus = input.decision === "approve" ? "approved" : "rejected";

    const item = toProductionReviewQueueItem({
      requestId: request.id,
      status: nextStatus,
      createdAt: String(request.created_at),
      note: request.request_notes,
      application,
      evidence,
      gates,
    });
    if (productionReviewLeaks(item).length > 0) {
      return { ok: false, code: "production_review_store_unavailable", ...none };
    }
    return {
      ok: true,
      decision: nextStatus,
      replay: false,
      request_id: request.id,
      application_id: application.id,
      remediation_class: partnerRemediation,
      item,
      ...none,
    };
  } catch (error) {
    if (error instanceof SupabaseAdminConfigurationError) {
      return { ok: false, code: "production_review_store_unavailable", ...none };
    }
    return { ok: false, code: "production_review_store_unavailable", ...none };
  }
}
