// FILE: app/api/passport/reusable-credentials/import/route.ts

import { NextRequest, NextResponse } from "next/server";
import { parseReusableCredentialImport } from "@/lib/passport/reusableCredential/parseImport";

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = parseReusableCredentialImport(raw);
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
    credential_id: parsed.credential.payload.credential_id,
    claim_types: parsed.credential.payload.asserted_claims.map((c) => c.claim_type),
  });
}
