// FILE: app/api/credentials/claims/route.ts
// GET active credential claims for a subject (Passport UI + integrators).

import { NextRequest, NextResponse } from "next/server";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { getActiveClaims } from "@/lib/credentials/claimsService";
import { claimTypeLabel } from "@/lib/credentials/claimSchema";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sui = req.nextUrl.searchParams.get("sui") ?? req.nextUrl.searchParams.get("sui_address");
  if (!sui) {
    return NextResponse.json({ error: "sui param required" }, { status: 400 });
  }

  try {
    const subject = normalizeSuiAddress(sui);
    const claims = await getActiveClaims(subject);

    return NextResponse.json({
      subject_id: subject,
      claims: claims.map(c => ({
        claim_type: c.claim_type,
        label: claimTypeLabel(c.claim_type),
        value: c.claim_value,
        issuer_id: c.issuer_id,
        assurance_level: c.assurance_level,
        issued_at: c.issued_at,
        expires_at: c.expires_at,
        status: c.status,
        jurisdiction: c.jurisdiction,
      })),
      count: claims.length,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to load claims";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
