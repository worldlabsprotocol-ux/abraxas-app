// FILE: app/api/evaluation/two-app/start/route.ts
// Start external two-app reuse evaluation — reuses launchpad provisioning.

import { NextRequest, NextResponse } from "next/server";
import {
  enforceLaunchpadRateLimit,
  enforceLaunchpadTenantRateLimit,
  launchpadError,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { provisionTwoAppSandboxPair } from "@/lib/partner/twoAppEvaluation/provisionPair";
import { TWO_APP_DEFAULT_POLICY_PACK } from "@/lib/partner/twoAppEvaluation/contract";
import { buildSanitizedAcquisitionEvent } from "@/lib/gtm/acquisitionEvents";
import { recordGtmAcquisitionEvent } from "@/lib/gtm/acquisitionStore";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const limited = await enforceLaunchpadRateLimit(req, "/api/evaluation/two-app/start", 6);
  if (limited) return limited;

  const auth = await requireLaunchpadSession(req);
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return launchpadError("invalid_input", 400);
  }

  const anonymousSandboxId = String(body.sandbox_id ?? "").trim();
  const anonymousSuffix = anonymousSandboxId.replace(/[^a-f0-9]/gi, "").toLowerCase().slice(0, 12);
  const partnerLabel = String(body.partner_label ?? "eval").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24);

  let partnerId: string;
  if (auth.ok) {
    partnerId = auth.session.partnerId;
  } else {
    if (anonymousSuffix.length < 12) {
      return launchpadError("invalid_input", 400, "sandbox_id_required");
    }
    partnerId = `studio-${partnerLabel}-${anonymousSuffix}`;
  }

  const tenantLimited = await enforceLaunchpadTenantRateLimit(
    req,
    "/api/evaluation/two-app/start",
    partnerId,
    3,
  );
  if (tenantLimited) return tenantLimited;

  const result = await provisionTwoAppSandboxPair({
    partnerId,
    appADisplayName: String(body.app_a_name ?? "Evaluation App A"),
    appBDisplayName: String(body.app_b_name ?? "Evaluation App B"),
    returnUrl: String(body.return_url ?? ""),
    targetPolicyPack: String(body.target_policy_pack ?? TWO_APP_DEFAULT_POLICY_PACK),
    discoveryCompletedAt: body.discovery_completed_at ? String(body.discovery_completed_at) : null,
  });

  if (!result.ok) {
    return launchpadError(result.code, result.code === "return_url_rejected" ? 400 : 500);
  }

  recordGtmAcquisitionEvent(
    buildSanitizedAcquisitionEvent({
      event_type: "evaluation_started",
      attributes: { environment: "sandbox", proof_pack: "institutional_reuse" },
    }),
  );

  return NextResponse.json({
    ok: true,
    evaluation_id: result.record.evaluation_id,
    partner_id: result.record.partner_id,
    app_a: result.record.app_a,
    app_b: result.record.app_b,
    target_policy_pack: result.record.target_policy_pack,
    evidence_classification: result.record.evidence_classification,
    classification_source: result.record.classification_source,
    external_proof_eligibility: "NOT_ESTABLISHED",
    api_keys: result.api_keys,
    journey_href: `/evaluation/two-app?id=${result.record.evaluation_id}`,
    notice: "Sandbox evaluation only. Evidence status remains NOT YET OBSERVED until reuse is observed.",
  });
}
