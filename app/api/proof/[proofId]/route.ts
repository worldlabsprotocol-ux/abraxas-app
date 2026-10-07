// FILE: app/api/proof/[proofId]/route.ts
// Public authentication proof lookup — fully self-verifying without trusting Abraxas UI.

import { NextRequest, NextResponse } from "next/server";
import { ON_CHAIN_PROOF_THESIS } from "@/lib/intersectionThesis";
import { getSelfVerifiedAuthenticationProof } from "@/lib/authenticationProof/verifyProof";
import { toAgentProofView, toAgentProofNotFoundView } from "@/lib/agentVerification";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{  proofId: string  }> },
) {
  const routeParams = await params;
  const verified = await getSelfVerifiedAuthenticationProof(routeParams.proofId);
  if (!verified) {
    return NextResponse.json(
      {
        error: "Proof not found",
        proof_id: routeParams.proofId,
        agent: toAgentProofNotFoundView(routeParams.proofId),
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ...verified,
    thesis: ON_CHAIN_PROOF_THESIS,
    agent: toAgentProofView(verified),
  });
}
