// FILE: lib/protocolVerification/ephemeralRecognizedIssuerPresentation.server.ts
// Server boundary: holder-presented recognized issuer credentials → policy-ready evidence.

import "server-only";

import type { SignedPassportReusableCredential } from "@/lib/passport/reusableCredential/contract";
import type { PortableRevocationSignedArtifact } from "@/lib/protocol/portableRevocation";
import {
  EPHEMERAL_SANDBOX_AUTHORIZED_TEST_ISSUER_ID,
  isSandboxTestIssuerRuntimeAllowed,
} from "./ephemeralAuthorizedTestIssuer";
import { evaluatePassportCredentialEvidence } from "./evaluatePassportCredentialEvidence";
import type { ProtocolVerificationContext } from "./types";
import { SANDBOX_ISSUER_ID } from "@/lib/credentials/sandboxClaims";

export type EphemeralRecognizedIssuerPresentationInput = {
  credential: SignedPassportReusableCredential;
  portable_revocation_snapshot: PortableRevocationSignedArtifact;
  walletAddress: string;
  policyId: string;
  context: ProtocolVerificationContext;
  env?: Record<string, string | undefined>;
};

export type EphemeralRecognizedIssuerPresentationResult = Awaited<
  ReturnType<typeof evaluatePassportCredentialEvidence>
>;

export async function evaluateEphemeralRecognizedIssuerPresentation(
  input: EphemeralRecognizedIssuerPresentationInput,
): Promise<EphemeralRecognizedIssuerPresentationResult> {
  const issuerId = input.credential.payload.issuer_id;
  const sandboxIssuer =
    issuerId === EPHEMERAL_SANDBOX_AUTHORIZED_TEST_ISSUER_ID || issuerId === SANDBOX_ISSUER_ID;

  if (input.context === "production" && sandboxIssuer) {
    return { ok: false, code: "sandbox_issuer_not_production_trusted", unsupported: true };
  }

  if (sandboxIssuer && input.context === "sandbox_only" && !isSandboxTestIssuerRuntimeAllowed(input.env)) {
    return { ok: false, code: "authorized_test_issuer_disabled", unsupported: true };
  }

  return evaluatePassportCredentialEvidence({
    credential: input.credential,
    portable_revocation_snapshot: input.portable_revocation_snapshot,
    walletSubject: input.walletAddress,
    policyId: input.policyId,
    context: input.context,
    env: input.env,
  });
}
