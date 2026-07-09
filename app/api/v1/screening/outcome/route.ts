// FILE: app/api/v1/screening/outcome/route.ts
// Screening partner writes screening_outcome=clear (partner-gated).

import { NextRequest, NextResponse } from "next/server";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { applyScreeningClear } from "@/lib/screening/applyScreeningOutcome";
import { authenticateV1Partner } from "@/lib/verification/v1PartnerAuth";
import { logPartnerUsage } from "@/lib/partner/logPartnerUsage";

export async function POST(req: NextRequest) {
  const started = Date.now();
  const auth = await authenticateV1Partner(req, "verify:screening");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => ({})) as {
    sui_address?: string;
    provider_ref?: string;
    jurisdiction?: string;
    outcome?: string;
  };

  if (!body.sui_address || body.outcome !== "clear") {
    return NextResponse.json({ error: "sui_address and outcome=clear required" }, { status: 400 });
  }

  try {
    const subject = normalizeSuiAddress(body.sui_address);
    await applyScreeningClear({
      subjectId: subject,
      providerRef: body.provider_ref ?? `screening:${Date.now()}`,
      jurisdiction: body.jurisdiction,
    });

    void logPartnerUsage({
      endpoint: "/api/v1/screening/outcome",
      method: "POST",
      success: true,
      partner: auth.ctx,
      httpStatus: 200,
      responseTimeMs: Date.now() - started,
      recordType: "screening_outcome",
      recordId: subject,
      decision: "clear",
    });

    return NextResponse.json({ ok: true, subject_id: subject, screening_outcome: "clear" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Screening update failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
