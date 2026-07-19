// FILE: app/api/proof/[proofId]/route.ts
// Public authentication proof lookup — verify without trusting Abraxas UI.

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticationProof } from "@/lib/authenticationProof/issue";
import { ON_CHAIN_PROOF_THESIS } from "@/lib/intersectionThesis";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { proofId: string } },
) {
  const proof = await getAuthenticationProof(params.proofId);
  if (!proof) {
    return NextResponse.json({ error: "Proof not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...proof,
    artifact_type: "authentication_proof",
    thesis: ON_CHAIN_PROOF_THESIS,
    independently_verifiable: true,
  });
}
