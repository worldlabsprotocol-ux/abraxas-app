// FILE: lib/protocolVerification/evaluatePassportCredentialEvidence.ts

import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import { SANDBOX_ISSUER_ID } from "@/lib/credentials/sandboxClaims";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import { inferPolicyPackFromPolicyId } from "@/lib/partner/launchpad/policyPacks";
import { materializeAuthenticatedClaimsForPolicy } from "@/lib/passport/reusableCredential/authenticatedClaims";
import { verifyPassportReusableCredentialStrict } from "@/lib/passport/reusableCredential/verify";
import type { SignedPassportReusableCredential } from "@/lib/passport/reusableCredential/contract";
import {
  InMemoryPortableRevocationCheckpointStore,
  bootstrapTrustFromArtifact,
  type PortableRevocationSignedArtifact,
} from "@/lib/protocol/portableRevocation";
import type { ProtocolVerificationContext } from "./types";
import {
  EPHEMERAL_SANDBOX_AUTHORIZED_TEST_ISSUER_ID,
  ephemeralSandboxTestIssuerTrustEnv,
  isSandboxTestIssuerRuntimeAllowed,
  mayInjectSandboxTestIssuerRegistry,
} from "./ephemeralAuthorizedTestIssuer";

export type PassportCredentialEvidenceInput = {
  credential: SignedPassportReusableCredential;
  portable_revocation_snapshot: PortableRevocationSignedArtifact;
  walletSubject: string;
  policyId: string;
  context: ProtocolVerificationContext;
  now?: Date;
  env?: Record<string, string | undefined>;
};

export type PassportCredentialEvidenceResult =
  | {
      ok: true;
      materialized_claims: CredentialClaimRecord[];
      issuer_id: string;
      sandbox_labeled: boolean;
    }
  | { ok: false; code: string; unsupported?: boolean };

export async function evaluatePassportCredentialEvidence(
  input: PassportCredentialEvidenceInput,
): Promise<PassportCredentialEvidenceResult> {
  const env = {
    ...(input.env ?? process.env),
    ...mergeTestIssuerEnv(input.context, input.env),
  };
  const now = input.now ?? new Date();
  const pack = inferPolicyPackFromPolicyId(input.policyId);
  if (!pack?.rules) {
    return { ok: false, code: "policy_not_found" };
  }

  const issuerId = input.credential.payload.issuer_id;
  const sandboxIssuer = issuerId === EPHEMERAL_SANDBOX_AUTHORIZED_TEST_ISSUER_ID || issuerId === SANDBOX_ISSUER_ID;

  if (input.context === "production" && sandboxIssuer) {
    return { ok: false, code: "sandbox_issuer_not_production_trusted", unsupported: true };
  }

  if (sandboxIssuer && input.context === "sandbox_only" && !isSandboxTestIssuerRuntimeAllowed(env)) {
    return { ok: false, code: "authorized_test_issuer_disabled", unsupported: true };
  }

  const expectedHolder = subjectPseudonymId(input.walletSubject);
  if (input.credential.payload.holder_subject_id !== expectedHolder) {
    return { ok: false, code: "credential_holder_mismatch" };
  }

  const checkpointStore = new InMemoryPortableRevocationCheckpointStore();
  const bootstrapTrusts = [bootstrapTrustFromArtifact({ artifact: input.portable_revocation_snapshot })];

  const verified = await verifyPassportReusableCredentialStrict({
    credential: input.credential,
    portableRevocationSnapshot: input.portable_revocation_snapshot,
    checkpointStore,
    bootstrapTrusts,
    now,
    env,
  });
  if (!verified.ok) {
    const codeMap: Record<string, string> = {
      invalid_signature: "credential_signature_invalid",
      expired: "credential_expired",
      issuer_registry_missing: "issuer_registry_missing",
      issuer_untrusted: "issuer_untrusted",
      signing_key_mismatch: "issuer_signing_key_mismatch",
      credential_revoked_or_unknown: "credential_revoked",
      revocation_verification_failed: "revocation_verification_failed",
      missing_revocation_snapshot: "revocation_snapshot_missing",
    };
    return { ok: false, code: codeMap[verified.code] ?? "credential_verification_failed" };
  }

  const materialized = materializeAuthenticatedClaimsForPolicy({
    credential: input.credential,
    policyRules: pack.rules,
    now,
  });
  if (!materialized.ok) {
    return { ok: false, code: materialized.code };
  }

  return {
    ok: true,
    materialized_claims: materialized.claims,
    issuer_id: issuerId,
    sandbox_labeled: sandboxIssuer,
  };
}

function mergeTestIssuerEnv(
  context: ProtocolVerificationContext,
  env: Record<string, string | undefined> | undefined,
): Record<string, string | undefined> {
  const runtimeEnv = env ?? process.env;
  if (!mayInjectSandboxTestIssuerRegistry(context === "production" ? "production" : "sandbox_only", runtimeEnv)) {
    return {};
  }
  return ephemeralSandboxTestIssuerTrustEnv();
}
