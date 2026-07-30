// FILE: app/api/credentials/claims/route.ts
// GET active credential claims for authenticated holder (Passport UI).

import { NextRequest, NextResponse } from "next/server";
import { getActiveClaims } from "@/lib/credentials/claimsService";
import { claimTypeLabel } from "@/lib/credentials/claimSchema";
import { requireBrowserSession } from "@/lib/auth/browserSession";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireBrowserSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const subject = auth.session.suiAddress;
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
