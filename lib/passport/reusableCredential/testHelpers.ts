// FILE: lib/passport/reusableCredential/testHelpers.ts

import type { PartnerPolicyRules } from "@/lib/policy/types";
import type { PortableRevocationSignedArtifact } from "@/lib/protocol/portableRevocation";
import { InMemoryPortableRevocationCheckpointStore } from "@/lib/protocol/portableRevocation";
import { bootstrapTrustFromArtifact } from "@/lib/protocol/portableRevocation";
import {
  authorizePartnerFromReusableCredential,
  type PartnerAuthorizationFromCredentialInput,
  type PartnerAuthorizationFromCredentialResult,
} from "./partnerAuthorization";
import type { SignedPassportReusableCredential } from "./contract";
import {
  BUILD_566_HOLDER_POSSESSION_KEYPAIR,
  BUILD_566_RECEIPT_SIGNING_KEY,
} from "./fixtures";
import {
  issuePassportPossessionChallenge,
  signPassportPossessionChallenge,
  type PassportPossessionChallengeStore,
} from "./holderPossessionChallenge";

export async function authorize566PartnerForTest(input: {
  credential: SignedPassportReusableCredential;
  partnerId: string;
  policyId: string;
  policyRules: PartnerPolicyRules;
  requestId: string;
  portableRevocationSnapshot: PortableRevocationSignedArtifact;
  env?: Record<string, string | undefined>;
  now?: Date;
  challengeStore?: PassportPossessionChallengeStore;
}): Promise<PartnerAuthorizationFromCredentialResult> {
  const checkpointStore = new InMemoryPortableRevocationCheckpointStore();
  const challenge = issuePassportPossessionChallenge({
    credentialId: input.credential.payload.credential_id,
    partnerId: input.partnerId,
    policyId: input.policyId,
    now: input.now,
    store: input.challengeStore,
  });
  const proof = {
    challenge_id: challenge.challenge_id,
    signature: signPassportPossessionChallenge(challenge, BUILD_566_HOLDER_POSSESSION_KEYPAIR.secretKey),
  };
  const authInput: PartnerAuthorizationFromCredentialInput = {
    credential: input.credential,
    partnerId: input.partnerId,
    policyId: input.policyId,
    policyVersion: 1,
    policyRules: input.policyRules,
    requestId: input.requestId,
    receiptSigningKey: BUILD_566_RECEIPT_SIGNING_KEY,
    portableRevocationSnapshot: input.portableRevocationSnapshot,
    possessionChallenge: challenge,
    holderPossessionProof: proof,
    checkpointStore,
    bootstrapTrusts: [bootstrapTrustFromArtifact({ artifact: input.portableRevocationSnapshot })],
    now: input.now,
    env: input.env,
  };
  return authorizePartnerFromReusableCredential(authInput);
}
