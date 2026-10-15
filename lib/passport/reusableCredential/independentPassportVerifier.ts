// FILE: lib/passport/reusableCredential/independentPassportVerifier.ts
// Build #569: verify Passport institutional bundles without Abraxas identity database access.

import type { HolderPolicyScopedPresentation } from "@/lib/protocol/proofFirst/holderPolicyPresentation";
import { assertPresentationExcludesSensitiveCustody } from "@/lib/protocol/proofFirst/holderPolicyPresentation";
import { verifyHolderPresentationAtRelyingParty } from "@/lib/protocol/proofFirst/proofFirstRelyingParty";
import type { PortableRevocationSignedArtifact } from "@/lib/protocol/portableRevocation";
import {
  bootstrapTrustFromArtifact,
  InMemoryPortableRevocationCheckpointStore,
} from "@/lib/protocol/portableRevocation";
import { build546PortableRevocationIssuerTrust } from "@/lib/protocol/portableRevocation/fixtures";
import type { ReceiptConsumptionStore } from "@/lib/institutionalCertification/build547/receiptConsumptionStore";
import { InMemoryReceiptConsumptionStore } from "@/lib/institutionalCertification/build547/receiptConsumptionStore";
import { ExternalRelyingPartyHarness } from "@/lib/institutionalCertification/build546/externalRelyingParty";
import type { SignedPassportReusableCredential } from "./contract";
import { verifyPassportReusableCredentialStrict } from "./verify";
import { FilesystemPortableRevocationCheckpointStore } from "@/lib/protocol/portableRevocation";

export type PassportInstitutionalVerificationBundle = {
  credential: SignedPassportReusableCredential;
  presentation: HolderPolicyScopedPresentation;
  portable_revocation_snapshot: PortableRevocationSignedArtifact;
  partner_id: string;
  policy_id: string;
  request_id: string;
};

export type IndependentPassportVerifierTrustEnv = Record<string, string | undefined>;

export type IndependentPassportVerifierOptions = {
  env: IndependentPassportVerifierTrustEnv;
  consumptionStore?: ReceiptConsumptionStore;
  checkpointDir?: string;
  now?: Date;
  advanceCheckpoint?: boolean;
};

async function openCheckpointStore(input: IndependentPassportVerifierOptions) {
  if (input.checkpointDir?.trim()) {
    return FilesystemPortableRevocationCheckpointStore.open(input.checkpointDir.trim());
  }
  return new InMemoryPortableRevocationCheckpointStore();
}

export async function verifyPassportInstitutionalBundleIndependently(
  bundle: PassportInstitutionalVerificationBundle,
  options: IndependentPassportVerifierOptions,
) {
  const now = options.now ?? new Date();
  const checkpointStore = await openCheckpointStore(options);
  const bootstrapTrusts = [
    bootstrapTrustFromArtifact({ artifact: bundle.portable_revocation_snapshot }),
  ];

  const credentialCheck = await verifyPassportReusableCredentialStrict({
    credential: bundle.credential,
    portableRevocationSnapshot: bundle.portable_revocation_snapshot,
    checkpointStore,
    bootstrapTrusts,
    env: options.env,
    now,
  });
  if (!credentialCheck.ok) {
    return {
      ok: false as const,
      stage: "credential" as const,
      code: credentialCheck.code,
      detail: credentialCheck.detail,
    };
  }

  const custody = assertPresentationExcludesSensitiveCustody(bundle.presentation);
  if (!custody.ok) {
    return {
      ok: false as const,
      stage: "presentation_custody" as const,
      code: custody.reason,
    };
  }

  const rpConfig = {
    partnerId: bundle.partner_id,
    policyId: bundle.policy_id,
    env: options.env,
    allowSandbox: false,
    portableRevocation: {
      issuerTrust: build546PortableRevocationIssuerTrust(),
      checkpointStore,
      bootstrapTrusts,
      advanceCheckpointOnSuccess: options.advanceCheckpoint ?? true,
    },
  };

  const consumptionStore = options.consumptionStore ?? new InMemoryReceiptConsumptionStore();
  const harness = new ExternalRelyingPartyHarness({
    partnerId: bundle.partner_id,
    policyId: bundle.policy_id,
    env: options.env,
    allowSandbox: false,
    consumptionStore,
  });

  const decision = await verifyHolderPresentationAtRelyingParty({
    presentation: bundle.presentation,
    requestId: bundle.request_id,
    now,
    portableRevocationSnapshot: bundle.portable_revocation_snapshot,
    rp: rpConfig,
    harness,
  });

  return {
    ok: decision.outcome === "granted",
    stage: "relying_party" as const,
    decision,
    identity_database_required: false,
    abraxas_infrastructure_required: false,
  };
}
