// FILE: lib/passport/reusableCredential/build569IndependentInstitutionTestHelpers.ts

import type { ReceiptSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { BUILD_546_PRIMARY_KEY } from "@/lib/institutionalCertification/build546/fixtures";
import { PORTABLE_REVOCATION_TEST_ISSUER_ID } from "@/lib/protocol/portableRevocation/fixtures";
import type { PortableRevocationSignedArtifact } from "@/lib/protocol/portableRevocation";
import { bootstrapTrustFromArtifact } from "@/lib/protocol/portableRevocation";
import {
  type IndependentInstitutionConfig,
  PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS_ENV,
  PORTABLE_REVOCATION_ISSUER_TRUST_ENV,
} from "./independentInstitutionConfig";

export function build569PortableRevocationIssuerTrustJson(credentialSigningKey: ReceiptSigningKeyPair): string {
  return JSON.stringify({
    bindings: [
      {
        receipt_signing_key_id: BUILD_546_PRIMARY_KEY.signingKeyId,
        revocation_issuer_id: PORTABLE_REVOCATION_TEST_ISSUER_ID,
        snapshot_signing_key_ids: [BUILD_546_PRIMARY_KEY.signingKeyId],
      },
      {
        receipt_signing_key_id: credentialSigningKey.signingKeyId,
        revocation_issuer_id: PORTABLE_REVOCATION_TEST_ISSUER_ID,
        snapshot_signing_key_ids: [BUILD_546_PRIMARY_KEY.signingKeyId],
      },
    ],
  });
}

export function build569IndependentInstitutionConfig(input: {
  partnerId: string;
  policyId: string;
  trustEnv: Record<string, string>;
  /** Founder provisioned bootstrap from an out of band trusted snapshot (never from verify time bundle). */
  trustedBootstrapSnapshot?: PortableRevocationSignedArtifact;
}): IndependentInstitutionConfig {
  const trust_env = { ...input.trustEnv };
  if (input.trustedBootstrapSnapshot) {
    trust_env[PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS_ENV] = JSON.stringify([
      bootstrapTrustFromArtifact({ artifact: input.trustedBootstrapSnapshot }),
    ]);
  }
  if (!trust_env[PORTABLE_REVOCATION_ISSUER_TRUST_ENV]) {
    throw new Error("trust_env must include portable revocation issuer trust for Build #569 tests");
  }
  return {
    partner_id: input.partnerId,
    policy_id: input.policyId,
    trust_env,
  };
}
