// FILE: app/api/v1/policies/evaluate/route.ts
// Direct policy evaluation for first-party flows (no consent ceremony).

import { NextRequest, NextResponse } from "next/server";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { authenticatePartner } from "@/lib/verification/partnerAuth";
import { evaluateSubjectPolicy } from "@/lib/verification/requestsService";

export async function POST(req: NextRequest) {
  const auth = authenticatePartner(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
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
    const result = await evaluateSubjectPolicy(subject, body.policy_id);

    return NextResponse.json({
      decision: result.decision,
      policy_id: result.policy_id,
      policy_version: result.policy_version,
      claims: result.claims,
      reason_codes: result.reason_codes,
      valid_until: result.valid_until,
      missing_claims: result.missing_claims,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Evaluation failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
