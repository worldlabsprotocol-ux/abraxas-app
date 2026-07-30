// FILE: app/api/v1/policies/evaluate/route.ts
// Direct policy evaluation for server-side partner checks (no consent ceremony).

import { NextRequest, NextResponse } from "next/server";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { authenticateV1Partner } from "@/lib/verification/v1PartnerAuth";
import { evaluateSubjectPolicy } from "@/lib/verification/requestsService";
import { logPartnerUsage } from "@/lib/partner/logPartnerUsage";

export async function POST(req: NextRequest) {
  const started = Date.now();
  const auth = await authenticateV1Partner(req, "verify:requests");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => ({})) as {
    policy_id?: string;
    sui_address?: string;
  };

  if (!body.policy_id || !body.sui_address) {
    return NextResponse.json({ error: "policy_id and sui_address required" }, { status: 400 });
  }

  try {
    const subject = normalizeSuiAddress(body.sui_address);
    const result = await evaluateSubjectPolicy(subject, body.policy_id, auth.partnerId);

    void logPartnerUsage({
      endpoint: "/api/v1/policies/evaluate",
      method: "POST",
      success: true,
      partner: auth.ctx,
      httpStatus: 200,
      responseTimeMs: Date.now() - started,
      policyId: result.policy_id,
      policyVersion: String(result.policy_version),
      decision: result.decision,
    });

    return NextResponse.json({
      decision: result.decision,
      policy_id: result.policy_id,
      policy_version: result.policy_version,
      claims: result.claims,
      reason_codes: result.reason_codes,
      valid_until: result.valid_until,
      missing_claims: result.missing_claims,
      decision_context: result.decision_context ?? "production",
      production_usable: result.production_usable ?? result.decision === "approved",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Evaluation failed";
    void logPartnerUsage({
      endpoint: "/api/v1/policies/evaluate",
      method: "POST",
      success: false,
      partner: auth.ctx,
      httpStatus: 400,
      responseTimeMs: Date.now() - started,
      policyId: body.policy_id,
    });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
