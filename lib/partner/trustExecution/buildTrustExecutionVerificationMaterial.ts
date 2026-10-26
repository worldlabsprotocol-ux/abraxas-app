// FILE: lib/partner/trustExecution/buildTrustExecutionVerificationMaterial.ts
// Portable artifacts for relying-party verification — no server currently_acceptable verdict.

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { toIndependentVerifierRecord } from "@/lib/decisionReceipts/independentVerifierBridge";
import { publishSignedIssuerAuthorityFromRegistry } from "@/lib/persistence/boundary/issuerAuthority/buildFromRegistry";
import { evaluateSovereignCurrentValidity } from "@/lib/persistence/boundary/sovereignCurrentValidity/evaluate";
import { publishSignedReceiptStatusFromSovereignEvaluation } from "@/lib/persistence/boundary/trustDistribution/publishSignedReceiptStatus";
import type { TrustExecutionVerificationMaterial } from "./trustExecutionTypes";

export async function buildAuthoritativeVerificationMaterial(input: {
  record: DecisionReceiptRecord;
  applicationId: string;
  env: Record<string, string | undefined>;
  anchorPublicJwk: JsonWebKey;
  anchorPrivateJwk: JsonWebKey;
  anchorKeyId: string;
  registryVersion: number;
}): Promise<
  | { ok: true; material: TrustExecutionVerificationMaterial }
  | { ok: false; code: string }
> {
  const signedIssuer = publishSignedIssuerAuthorityFromRegistry({
    registryVersion: input.registryVersion,
    anchorKeyId: input.anchorKeyId,
    anchorPrivateJwk: input.anchorPrivateJwk,
    env: input.env,
  });
  if (!("payload" in signedIssuer)) {
    return { ok: false, code: signedIssuer.reason };
  }

  const evaluation = await evaluateSovereignCurrentValidity({
    record: input.record,
    signedIssuerAuthority: signedIssuer,
    trustAnchorPublicJwk: input.anchorPublicJwk,
    expectedApplicationId: input.applicationId,
    expectedPartnerId: input.record.partner_id,
    expectedPolicyId: input.record.policy_id,
    env: input.env,
  });

  if (!evaluation.store_available) {
    return { ok: false, code: "validity_store_unavailable" };
  }

  const signedStatus = await publishSignedReceiptStatusFromSovereignEvaluation({
    record: input.record,
    evaluation,
    signedIssuerAuthorityEnvironment: signedIssuer.payload.environment,
    env: input.env,
  });
  if (!("payload" in signedStatus)) {
    return { ok: false, code: signedStatus.reason };
  }

  return {
    ok: true,
    material: {
      portable_receipt: toIndependentVerifierRecord(input.record),
      signed_issuer_authority: signedIssuer,
      signed_status_statement: signedStatus,
    },
  };
}

export async function buildFixtureVerificationMaterial(input: {
  record: DecisionReceiptRecord;
  env: Record<string, string | undefined>;
  anchorKey: ReceiptSigningKeyPair;
  registryVersion: number;
}): Promise<TrustExecutionVerificationMaterial> {
  const { buildFixturePortableVerificationArtifacts } = await import(
    "./executeTrustExecutionFixture.internal"
  );
  return buildFixturePortableVerificationArtifacts(input);
}
