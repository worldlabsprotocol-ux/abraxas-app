// FILE: app/api/verification/check-level/route.ts
// Hybrid model: check if user needs deep verification before an action.

import { NextRequest, NextResponse } from "next/server";
import { checkVerificationLevel, type VerificationAction } from "@/lib/verification/checkLevel";

const VALID_ACTIONS: VerificationAction[] = [
  "browse",
  "book_asset",
  "high_value_transaction",
  "invest_rwa",
  "submit_asset",
];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    sui_address?: string;
    userId?: string;
    action?: string;
  };

  const action = (body.action ?? "browse") as VerificationAction;
  if (!VALID_ACTIONS.includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const sui = body.sui_address ?? body.userId ?? null;
  const result = await checkVerificationLevel(sui, action);

  return NextResponse.json({
    needsDeepVerification: result.needsDeepVerification,
    currentLevel: result.currentLevel,
    decision: result.decision,
    policy_id: result.policy_id,
    missing_claims: result.missing_claims,
    reason_codes: result.reason_codes,
  });
}
