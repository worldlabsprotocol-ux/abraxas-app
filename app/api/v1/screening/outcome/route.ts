// FILE: app/api/v1/screening/outcome/route.ts
// Screening partner writes screening_outcome=clear (partner-gated).

import { NextRequest, NextResponse } from "next/server";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { applyScreeningClear } from "@/lib/screening/applyScreeningOutcome";

const SCREENING_KEY = process.env.SCREENING_PARTNER_API_KEY ?? process.env.PARTNER_API_KEY ?? "";

function authScreening(req: NextRequest): boolean {
  if (!SCREENING_KEY) return process.env.NODE_ENV !== "production";
  const key = req.headers.get("x-api-key") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return key === SCREENING_KEY;
}

export async function POST(req: NextRequest) {
  if (!authScreening(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    return NextResponse.json({ ok: true, subject_id: subject, screening_outcome: "clear" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Screening update failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
