// FILE: lib/passport/reusableCredential/independentPassportVerifier.ts
// Build #569: verify Passport institutional bundles without Abraxas identity database access.

import type { HolderPolicyScopedPresentation } from "@/lib/protocol/proofFirst/holderPolicyPresentation";
import { assertPresentationExcludesSensitiveCustody } from "@/lib/protocol/proofFirst/holderPolicyPresentation";
import { verifyHolderPresentationAtRelyingParty } from "@/lib/protocol/proofFirst/proofFirstRelyingParty";
import type { PortableRevocationCheckpointStore, PortableRevocationSignedArtifact } from "@/lib/protocol/portableRevocation";
import {
  FilesystemPortableRevocationCheckpointStore,
  InMemoryPortableRevocationCheckpointStore,
} from "@/lib/protocol/portableRevocation";
import type { ReceiptConsumptionStore } from "@/lib/institutionalCertification/build547/receiptConsumptionStore";
import { InMemoryReceiptConsumptionStore } from "@/lib/institutionalCertification/build547/receiptConsumptionStore";
import { ExternalRelyingPartyHarness } from "@/lib/institutionalCertification/build546/externalRelyingParty";
import type { SignedPassportReusableCredential } from "./contract";
import { verifyPassportReusableCredentialStrict } from "./verify";
import { portableRevocationIssuerTrustForCredentialIssuer } from "./credentialRevocationStrict";
import {
  type IndependentInstitutionConfig,
  resolveInstitutionPortableRevocationTrust,
  validateBundleEvidenceAgainstInstitution,
} from "./independentInstitutionConfig";

export type PassportInstitutionalVerificationBundle = {
  credential: SignedPassportReusableCredential;
  presentation: HolderPolicyScopedPresentation;
  portable_revocation_snapshot: PortableRevocationSignedArtifact;
  partner_id: string;
  policy_id: string;
  request_id: string;
};

export type IndependentVerifierFailureStage =
  | "institution_config"
  | "bundle_evidence"
  | "operational_stores"
  | "credential"
  | "presentation_custody"
  | "relying_party";

export type IndependentVerifierResult =
  | {
      ok: true;
      stage: "relying_party";
      decision: Awaited<ReturnType<typeof verifyHolderPresentationAtRelyingParty>>;
      identity_database_required: false;
      abraxas_infrastructure_required: false;
    }
  | {
      ok: false;
      stage: IndependentVerifierFailureStage;
      code: string;
      detail?: string | string[];
      decision?: Awaited<ReturnType<typeof verifyHolderPresentationAtRelyingParty>>;
    };

export type IndependentVerifierOperationalOptions = {
  institution: IndependentInstitutionConfig;
  consumptionDir: string;
  checkpointDir: string;
  now?: Date;
  advanceCheckpoint?: boolean;
};

export type IndependentVerifierInMemoryTestOptions = {
  institution: IndependentInstitutionConfig;
  /** Explicit test only. Never used by the operational CLI. */
  testMemoryStores: true;
  consumptionStore?: ReceiptConsumptionStore;
  checkpointStore?: PortableRevocationCheckpointStore;
  now?: Date;
  advanceCheckpoint?: boolean;
};

async function verifyCore(
  bundle: PassportInstitutionalVerificationBundle,
  input: {
    institution: IndependentInstitutionConfig;
    consumptionStore: ReceiptConsumptionStore;
    checkpointStore: PortableRevocationCheckpointStore;
    now: Date;
    advanceCheckpoint: boolean;
  },
): Promise<IndependentVerifierResult> {
  const trustMaterial = resolveInstitutionPortableRevocationTrust(input.institution.trust_env);
  if (!trustMaterial.ok) {
    return { ok: false, stage: "institution_config", code: trustMaterial.code };
  }

  const evidence = validateBundleEvidenceAgainstInstitution({ bundle, institution: input.institution });
  if (!evidence.ok) {
    return { ok: false, stage: "bundle_evidence", code: evidence.code };
  }

  const credentialCheck = await verifyPassportReusableCredentialStrict({
    credential: bundle.credential,
    portableRevocationSnapshot: bundle.portable_revocation_snapshot,
    checkpointStore: input.checkpointStore,
    bootstrapTrusts: trustMaterial.bootstrapTrusts,
    env: input.institution.trust_env,
    now: input.now,
  });
  if (!credentialCheck.ok) {
    return {
      ok: false,
      stage: "credential",
      code: credentialCheck.code,
      detail: credentialCheck.detail,
    };
  }

  const custody = assertPresentationExcludesSensitiveCustody(bundle.presentation);
  if (!custody.ok) {
    return { ok: false, stage: "presentation_custody", code: custody.reason };
  }

  const rpConfig = {
    partnerId: input.institution.partner_id,
    policyId: input.institution.policy_id,
    env: input.institution.trust_env,
    allowSandbox: false,
    portableRevocation: {
      issuerTrust: trustMaterial.issuerTrust,
      checkpointStore: input.checkpointStore,
      bootstrapTrusts: trustMaterial.bootstrapTrusts,
      advanceCheckpointOnSuccess: input.advanceCheckpoint,
    },
  };

  const harness = new ExternalRelyingPartyHarness({
    partnerId: input.institution.partner_id,
    policyId: input.institution.policy_id,
    env: input.institution.trust_env,
    allowSandbox: false,
    consumptionStore: input.consumptionStore,
  });

  const decision = await verifyHolderPresentationAtRelyingParty({
    presentation: bundle.presentation,
    requestId: bundle.request_id,
    now: input.now,
    portableRevocationSnapshot: bundle.portable_revocation_snapshot,
    rp: rpConfig,
    harness,
  });

  if (decision.outcome !== "granted") {
    return {
      ok: false,
      stage: "relying_party",
      code: decision.partner_visible?.result ?? "authorization_denied",
      decision,
    };
  }

  return {
    ok: true,
    stage: "relying_party",
    decision,
    identity_database_required: false,
    abraxas_infrastructure_required: false,
  };
}

/** Operational path: durable consumption and checkpoint directories required. */
export async function verifyPassportInstitutionalBundleOperational(
  bundle: PassportInstitutionalVerificationBundle,
  options: IndependentVerifierOperationalOptions,
): Promise<IndependentVerifierResult> {
  const consumptionDir = options.consumptionDir?.trim();
  const checkpointDir = options.checkpointDir?.trim();
  if (!consumptionDir || !checkpointDir) {
    return { ok: false, stage: "operational_stores", code: "durable_store_path_required" };
  }

  const { FileReceiptConsumptionStore } = await import(
    "@/lib/institutionalCertification/build547/receiptConsumptionStore"
  );
  const consumptionStore = new FileReceiptConsumptionStore(consumptionDir);
  const checkpointStore = await FilesystemPortableRevocationCheckpointStore.open(checkpointDir);
  const now = options.now ?? new Date();

  return verifyCore(bundle, {
    institution: options.institution,
    consumptionStore,
    checkpointStore,
    now,
    advanceCheckpoint: options.advanceCheckpoint ?? true,
  });
}

/** Explicit in memory test helper only. */
export async function verifyPassportInstitutionalBundleInMemoryForTests(
  bundle: PassportInstitutionalVerificationBundle,
  options: IndependentVerifierInMemoryTestOptions,
): Promise<IndependentVerifierResult> {
  if (options.testMemoryStores !== true) {
    return { ok: false, stage: "operational_stores", code: "test_memory_stores_not_declared" };
  }
  const now = options.now ?? new Date();
  return verifyCore(bundle, {
    institution: options.institution,
    consumptionStore: options.consumptionStore ?? new InMemoryReceiptConsumptionStore(),
    checkpointStore: options.checkpointStore ?? new InMemoryPortableRevocationCheckpointStore(),
    now,
    advanceCheckpoint: options.advanceCheckpoint ?? true,
  });
}

/** @deprecated Use operational or in memory test entrypoints. */
export async function verifyPassportInstitutionalBundleIndependently(
  bundle: PassportInstitutionalVerificationBundle,
  options: {
    env: Record<string, string | undefined>;
    consumptionStore?: ReceiptConsumptionStore;
    checkpointDir?: string;
    now?: Date;
    advanceCheckpoint?: boolean;
  },
): Promise<IndependentVerifierResult> {
  const institution: IndependentInstitutionConfig = {
    partner_id: bundle.partner_id,
    policy_id: bundle.policy_id,
    trust_env: Object.fromEntries(
      Object.entries(options.env).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
    ),
  };
  if (options.checkpointDir?.trim() && options.consumptionStore) {
    const checkpointStore = await FilesystemPortableRevocationCheckpointStore.open(options.checkpointDir.trim());
    return verifyCore(bundle, {
      institution,
      consumptionStore: options.consumptionStore,
      checkpointStore,
      now: options.now ?? new Date(),
      advanceCheckpoint: options.advanceCheckpoint ?? true,
    });
  }
  return verifyPassportInstitutionalBundleInMemoryForTests(bundle, {
    institution,
    testMemoryStores: true,
    consumptionStore: options.consumptionStore,
    now: options.now,
    advanceCheckpoint: options.advanceCheckpoint,
  });
}

export { portableRevocationIssuerTrustForCredentialIssuer };
