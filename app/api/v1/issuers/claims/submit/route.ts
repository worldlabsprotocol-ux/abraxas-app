// FILE: app/api/v1/issuers/claims/submit/route.ts
// Issuer-signed claim attestation submission — server verifies signature and scope.

import { NextRequest, NextResponse } from "next/server";
import { authenticateV1Partner } from "@/lib/verification/v1PartnerAuth";
import { submitIssuerClaimAttestation } from "@/lib/trust/issuerClaimAttestation";
import type { IssuerClaimAttestationPayload } from "@/lib/trust/issuerClaimAttestation";

export async function POST(req: NextRequest) {
  const auth = await authenticateV1Partner(req, "verify:credential");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => ({})) as {
    payload?: IssuerClaimAttestationPayload;
    signature?: string;
  };

  if (!body.payload || !body.signature) {
    return NextResponse.json({ error: "payload and signature required" }, { status: 400 });
  }

  const result = await submitIssuerClaimAttestation({
    payload: body.payload,
    signature: body.signature,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, claim_types: result.claim_types });
}
