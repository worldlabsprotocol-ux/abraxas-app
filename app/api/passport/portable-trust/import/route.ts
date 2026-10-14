// FILE: app/api/passport/portable-trust/import/route.ts
// Structural validation only — does not verify issuer trust or revocation.

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
    return NextResponse.json(
      {
        structural_validation: "failed" as const,
        code: parsed.code,
        trust_verification: "not_performed" as const,
        issuer_authenticity: "not_verified" as const,
        revocation_freshness: "not_verified" as const,
      },
      { status: 400 },
    );
  }
  return NextResponse.json({
    structural_validation: "passed" as const,
    trust_verification: "not_performed" as const,
    issuer_authenticity: "not_verified" as const,
    revocation_freshness: "not_verified" as const,
    receipt_id: parsed.bundle.presentation.signed_decision_receipt.id,
    partner_id: parsed.bundle.presentation.audience_partner_id,
    policy_id: parsed.bundle.presentation.policy_id,
    portability_limits: parsed.bundle.portability_limits,
  });
}
