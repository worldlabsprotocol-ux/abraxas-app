// FILE: lib/partner/build592/externalVerificationProof.ts

import type { InstitutionalPresentationVerificationResult } from "@/lib/institutionalVerification/contract";
import { INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION } from "@/lib/institutionalVerification/contract";
import {
  allAuthorizationChecksConfirmed,
  deriveAuthorizationChecks,
  type AuthorizationCheckState,
  type DerivedAuthorizationChecks,
} from "@/lib/partner/build592/authorizationCheckDerivation";

export const EXTERNAL_VERIFICATION_PROOF_CONTRACT_VERSION = "592.v2" as const;

export type ExternalVerificationEvidenceMode =
  | "production_portable_revocation"
  | "isolated_sdk_fixture";

export type ReceiptProvenance =
  | "not_supplied"
  | "operator_supplied_file"
  | "live_sandbox_holder_flow";

export type ExternalVerificationExecutionEnvironment =
  | "operator_workstation"
  | "cloud_agent"
  | "ci";

export interface ExternalVerificationProofRecord {
  contract_version: typeof EXTERNAL_VERIFICATION_PROOF_CONTRACT_VERSION;
  record_kind: "local_execution_record";
  operator_identity_authenticated: false;
  evidence_mode: ExternalVerificationEvidenceMode;
  receipt_provenance: ReceiptProvenance;
  execution_environment: ExternalVerificationExecutionEnvironment;
  abraxas_integration_telemetry: {
    proves_external_verification: false;
    notice: string;
  };
  sandbox: {
    application_id: string | null;
    public_slug: string | null;
    partner_id: string;
    policy_id: string;
    policy_version: number | null;
    environment: string;
  };
  receipt: {
    receipt_id: string;
    request_id: string;
  };
  trust: {
    receipt_key_document_digest_pin: string | null;
    trust_pin_required: boolean;
    trust_pin_satisfied: boolean;
    sdk_contract_version: string;
    verification_contract_version: typeof INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION;
  };
  revocation: {
    mechanism: "portable_revocation_snapshot" | "lightweight_status_fixture_only";
    portable_revocation_authenticated: boolean;
  };
  verification: {
    verified_at: string;
    verification_intent: "authorize" | "inspect_only";
    authorize: boolean;
    verdict: InstitutionalPresentationVerificationResult["verdict"];
    rejection_reasons: string[];
    cryptographically_authentic: boolean;
    currently_authorizable: boolean;
    replay_detected: boolean;
    durable_consumption_recorded: boolean;
  };
  authorization_checks: DerivedAuthorizationChecks;
  provenance: {
    evidence_source: string;
    sdk_package: string;
    operator_command: string;
    notice: string;
  };
}

const TELEMETRY_NOTICE =
  "receipt_verification_succeeded and verification_successes are Abraxas-side integration telemetry only.";

const LOCAL_RECORD_NOTICE =
  "This JSON is a partner-safe local execution record from the institutional SDK on the relying party host. It does not authenticate which operator ran the command unless separately proven.";

export function buildExternalVerificationProofRecord(input: {
  presentationResult: InstitutionalPresentationVerificationResult;
  verifiedAt: string;
  executionEnvironment: ExternalVerificationExecutionEnvironment;
  evidenceMode: ExternalVerificationEvidenceMode;
  receiptProvenance: ReceiptProvenance;
  sandbox: ExternalVerificationProofRecord["sandbox"];
  receiptId: string;
  requestId: string;
  trustDigestPin: string | null;
  sdkPackage: string;
  evidenceSource: string;
  operatorCommand: string;
  durableConsumptionRecorded: boolean;
  replayDetected: boolean;
  portableRevocationAuthenticated: boolean;
  revocationMechanism: ExternalVerificationProofRecord["revocation"]["mechanism"];
}): ExternalVerificationProofRecord {
  const underlying = input.presentationResult.underlying.verifier;
  const trustPinRequired = input.evidenceMode === "production_portable_revocation";
  const trustPinSatisfied = Boolean(input.trustDigestPin?.trim());

  const authorization_checks = deriveAuthorizationChecks({
    verifier: underlying,
    presentationResult: input.presentationResult,
    portableRevocationRequired: input.evidenceMode === "production_portable_revocation",
    replayDetected: input.replayDetected,
    durableConsumptionRecorded: input.durableConsumptionRecorded,
  });

  return {
    contract_version: EXTERNAL_VERIFICATION_PROOF_CONTRACT_VERSION,
    record_kind: "local_execution_record",
    operator_identity_authenticated: false,
    evidence_mode: input.evidenceMode,
    receipt_provenance: input.receiptProvenance,
    execution_environment: input.executionEnvironment,
    abraxas_integration_telemetry: {
      proves_external_verification: false,
      notice: TELEMETRY_NOTICE,
    },
    sandbox: input.sandbox,
    receipt: {
      receipt_id: input.receiptId,
      request_id: input.requestId,
    },
    trust: {
      receipt_key_document_digest_pin: input.trustDigestPin,
      trust_pin_required: trustPinRequired,
      trust_pin_satisfied: trustPinRequired ? trustPinSatisfied : trustPinSatisfied,
      sdk_contract_version: input.presentationResult.contract_version,
      verification_contract_version: INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION,
    },
    revocation: {
      mechanism: input.revocationMechanism,
      portable_revocation_authenticated: input.portableRevocationAuthenticated,
    },
    verification: {
      verified_at: input.verifiedAt,
      verification_intent: input.presentationResult.verification_intent,
      authorize: input.presentationResult.authorize,
      verdict: input.presentationResult.verdict,
      rejection_reasons: [...input.presentationResult.rejection_reasons],
      cryptographically_authentic: underlying.cryptographically_authentic,
      currently_authorizable: underlying.currently_authorizable,
      replay_detected: input.replayDetected,
      durable_consumption_recorded: input.durableConsumptionRecorded,
    },
    authorization_checks,
    provenance: {
      evidence_source: input.evidenceSource,
      sdk_package: input.sdkPackage,
      operator_command: input.operatorCommand,
      notice: LOCAL_RECORD_NOTICE,
    },
  };
}

export function externalVerificationFullyAuthorized(
  proof: ExternalVerificationProofRecord,
): boolean {
  if (proof.evidence_mode === "isolated_sdk_fixture") {
    return false;
  }
  if (proof.receipt_provenance !== "live_sandbox_holder_flow") {
    return false;
  }
  if (!proof.trust.trust_pin_required || !proof.trust.trust_pin_satisfied) {
    return false;
  }
  if (!proof.revocation.portable_revocation_authenticated) {
    return false;
  }
  return (
    proof.verification.verification_intent === "authorize"
    && proof.verification.authorize === true
    && proof.verification.verdict === "valid"
    && proof.verification.replay_detected === false
    && proof.verification.durable_consumption_recorded === true
    && allAuthorizationChecksConfirmed(proof.authorization_checks)
  );
}

export function isolatedFixtureCryptographicSuccess(
  proof: ExternalVerificationProofRecord,
): boolean {
  if (proof.evidence_mode !== "isolated_sdk_fixture") return false;
  return (
    proof.verification.authorize === true
    && proof.verification.verdict === "valid"
    && proof.revocation.portable_revocation_authenticated === true
  );
}

export type { AuthorizationCheckState, DerivedAuthorizationChecks };
