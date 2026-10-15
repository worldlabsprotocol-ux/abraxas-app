// FILE: lib/passport/reusableCredential/independentReceiptVerification.ts
// Build #568: RP verification of reusable-credential authorization without Abraxas IDV database access.

import type { HolderPolicyScopedPresentation } from "@/lib/protocol/proofFirst/holderPolicyPresentation";
import { verifyHolderPresentationAtRelyingParty } from "@/lib/protocol/proofFirst/proofFirstRelyingParty";
import {
  createProofFirstPortableRevocationTestContext,
  rpWithSnapshotBootstrap,
} from "@/lib/protocol/proofFirst/proofFirstTestRevocation";
import type { PortableRevocationSignedArtifact } from "@/lib/protocol/portableRevocation";

export async function verifyReusableCredentialPartnerReceiptIndependently(input: {
  presentation: HolderPolicyScopedPresentation;
  portableRevocationSnapshot: PortableRevocationSignedArtifact;
  partnerId: string;
  policyId: string;
  env: Record<string, string | undefined>;
  requestId: string;
  now?: Date;
}) {
  const ctx = createProofFirstPortableRevocationTestContext();
  const rp = rpWithSnapshotBootstrap(
    {
      partnerId: input.partnerId,
      policyId: input.policyId,
      env: input.env,
      allowSandbox: true,
    },
    ctx,
    input.portableRevocationSnapshot,
  );
  return verifyHolderPresentationAtRelyingParty({
    presentation: input.presentation,
    requestId: input.requestId,
    now: input.now,
    portableRevocationSnapshot: input.portableRevocationSnapshot,
    rp,
  });
}
