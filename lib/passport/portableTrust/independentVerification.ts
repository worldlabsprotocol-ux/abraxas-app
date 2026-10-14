// FILE: lib/passport/portableTrust/independentVerification.ts
// Sandbox / demo — proof-first + portable revocation without Abraxas DB at RP.

import type { HolderPolicyScopedPresentation } from "@/lib/protocol/proofFirst/holderPolicyPresentation";
import { verifyHolderPresentationAtRelyingParty } from "@/lib/protocol/proofFirst/proofFirstRelyingParty";
import type { PortableRevocationSignedArtifact } from "@/lib/protocol/portableRevocation";
import type { ProofFirstVerificationOutcome } from "@/lib/protocol/proofFirst/proofFirstRelyingParty";
import {
  createProofFirstPortableRevocationTestContext,
  rpWithSnapshotBootstrap,
} from "@/lib/protocol/proofFirst/proofFirstTestRevocation";

export async function verifyHolderPresentationIndependently(input: {
  presentation: HolderPolicyScopedPresentation;
  portableRevocationSnapshot: PortableRevocationSignedArtifact;
  partnerId: string;
  policyId: string;
  env: Record<string, string | undefined>;
  requestId: string;
  now?: Date;
}): Promise<ProofFirstVerificationOutcome> {
  const ctx = createProofFirstPortableRevocationTestContext();
  return verifyHolderPresentationAtRelyingParty({
    presentation: input.presentation,
    requestId: input.requestId,
    now: input.now,
    portableRevocationSnapshot: input.portableRevocationSnapshot,
    rp: rpWithSnapshotBootstrap(
      { partnerId: input.partnerId, policyId: input.policyId, env: input.env },
      ctx,
      input.portableRevocationSnapshot,
    ),
  });
}
