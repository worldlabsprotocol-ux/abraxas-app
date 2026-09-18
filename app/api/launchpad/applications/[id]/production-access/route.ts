// FILE: app/api/launchpad/applications/[id]/production-access/route.ts

import { NextRequest } from "next/server";
import {
  enforceLaunchpadRateLimit,
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { recordLaunchpadActivity } from "@/lib/partner/launchpad/recordActivity";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import { hasProductionLaunchpadCallback } from "@/lib/partner/launchpad/productionCallbackReadiness";
import { isVerifiedDomainForCallbacks } from "@/lib/partner/launchpad/domainVerification";
import { approveLaunchpadProductionAccess } from "@/lib/partner/launchpad/productionApproval";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const limited = enforceLaunchpadRateLimit(req, "/api/launchpad/production-access", 5);
  if (limited) return limited;

  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;

  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);
  }
  if (!hasProductionLaunchpadCallback(app.allowed_return_urls)) {
    return launchpadError(
      LAUNCHPAD_PUBLIC_ERRORS.return_url_rejected,
      400,
      "production_https_callback_required",
    );
  }

  let body: { request_notes?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const sb = requireSupabaseAdmin();
  const { data: verifiedDomains } = await sb
    .from("partner_launchpad_domain_verifications")
    .select("hostname")
    .eq("application_id", params.id)
    .eq("partner_id", auth.session.partnerId)
    .eq("status", "verified");
  if (!isVerifiedDomainForCallbacks({
    allowedReturnUrls: app.allowed_return_urls,
    verifiedHostnames: (verifiedDomains ?? []).map((row) => String(row.hostname)),
  })) {
    return launchpadError(
      LAUNCHPAD_PUBLIC_ERRORS.return_url_rejected,
      400,
      "production_domain_verification_required",
    );
  }
  const { data, error } = await sb
    .from("partner_production_access_requests")
    .insert({
      application_id: params.id,
      partner_id: auth.session.partnerId,
      request_notes: body.request_notes?.trim() || null,
      status: "pending",
    })
    .select("id, status, created_at")
    .single();

  if (error) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.production_request_failed, 500);
  }

  await recordLaunchpadActivity(sb, {
    applicationId: params.id,
    partnerId: auth.session.partnerId,
    eventType: "production_access_requested",
    publicCode: "automated_gate_passed",
  });

  // The database RPC keeps key creation, application state, and audit logging atomic.
  // This is an automated approval: no generic operator queue for a verified integration.
  const approved = await approveLaunchpadProductionAccess({
    requestId: data.id,
    reviewerNotes: "Automated production safety gate passed",
  });
  if (!approved.ok) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.production_request_failed, 500, approved.code);
  }

  return launchpadJson({
    ok: true,
    automated_activation: true,
    key_prefix: approved.key_prefix,
    request: { id: data.id, status: "approved", created_at: data.created_at },
  });
}
