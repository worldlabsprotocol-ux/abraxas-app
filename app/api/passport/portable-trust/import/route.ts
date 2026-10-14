// FILE: app/api/passport/portable-trust/import/route.ts
// Validates holder import — does not persist or re-issue.

import { NextRequest, NextResponse } from "next/server";
import { parseHolderPortableImport } from "@/lib/passport/portableTrust";

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = parseHolderPortableImport(raw);
  if (!parsed.ok) {
    return NextResponse.json({ valid: false, code: parsed.code }, { status: 400 });
  }
  return NextResponse.json({
    valid: true,
    receipt_id: parsed.bundle.presentation.signed_decision_receipt.id,
    partner_id: parsed.bundle.presentation.audience_partner_id,
    policy_id: parsed.bundle.presentation.policy_id,
    portability_limits: parsed.bundle.portability_limits,
  });
}
