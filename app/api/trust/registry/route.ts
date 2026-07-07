// FILE: app/api/trust/registry/route.ts
// Public Trust Registry — issuers and schemas partners can rely on.

import { NextResponse } from "next/server";
import { listCredentialSchemas, listTrustedIssuers } from "@/lib/trust/trustRegistry";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [issuers, schemas] = await Promise.all([
      listTrustedIssuers(),
      listCredentialSchemas(),
    ]);

    return NextResponse.json({
      issuers,
      schemas,
      note: "A credential is only valuable if the verifier trusts the issuer.",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Registry unavailable";
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
