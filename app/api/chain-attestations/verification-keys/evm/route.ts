// FILE: app/api/chain-attestations/verification-keys/evm/route.ts
// Public EVM chain-attestation signer document. No private material.

import { NextRequest, NextResponse } from "next/server";
import {
  buildChainAttestationSignerDocument,
  rejectAttestationSignerClientOverride,
  assertNoPrivateAttestationSignerMaterial,
} from "@/lib/partner/chainAttestationSignerLifecycle";

export const dynamic = "force-dynamic";

const ALLOWED_QUERY: string[] = [];

export async function GET(req: NextRequest) {
  if (rejectAttestationSignerClientOverride(req.nextUrl.searchParams, ALLOWED_QUERY)) {
    return NextResponse.json({ ok: false, status: "invalid" }, { status: 400 });
  }
  const document = buildChainAttestationSignerDocument({ algorithm: "secp256k1" });
  if ("ok" in document && document.ok === false) {
    return NextResponse.json({ ok: false, status: document.status }, { status: 503 });
  }
  if (assertNoPrivateAttestationSignerMaterial(document).length > 0) {
    return NextResponse.json({ ok: false, status: "inconsistent" }, { status: 503 });
  }
  return NextResponse.json(document, {
    headers: {
      "Cache-Control": "no-store, must-revalidate",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
