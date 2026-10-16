// FILE: app/.well-known/abraxas-trust/v1/route.ts
// Well-known discovery for institutional trust verification contract v1.

import { NextResponse } from "next/server";
import { buildInstitutionalVerificationContractDocument } from "@/lib/institutionalVerification/verificationContractDocument";

export const dynamic = "force-dynamic";

export async function GET() {
  const document = buildInstitutionalVerificationContractDocument();
  if ("ok" in document && document.ok === false) {
    return NextResponse.json(
      { ok: false, status: document.status, contract_version: "586.v1" },
      { status: 503 },
    );
  }
  return NextResponse.json(document, {
    headers: {
      "Cache-Control": "no-store, must-revalidate",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
