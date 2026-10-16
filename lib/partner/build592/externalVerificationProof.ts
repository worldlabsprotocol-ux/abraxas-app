// FILE: lib/partner/build592/externalVerificationProof.ts
// Partner-safe external relying-party verification proof (Build #592).

import type { InstitutionalReceiptVerificationResult } from "@/lib/institutionalVerification/contract";
import { INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION } from "@/lib/institutionalVerification/contract";

export const EXTERNAL_VERIFICATION_PROOF_CONTRACT_VERSION = "592.v1" as const;

export type ExternalVerificationExecutionEnvironment =
  | "operator_workstation"
  | "cloud_agent"
  | "ci";

export interface ExternalVerificationProofRecord {
  contract_version: typeof EXTERNAL_VERIFICATION_PROOF_CONTRACT_VERSION;
  proof_kind: "external_sdk_relying_party";
  execution_environment: ExternalVerificationExecutionEnvironment;
  /** Abraxas integration events are never treated as this proof. */
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
    sdk_contract_version: string;
    verification_contract_version: typeof INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION;
  };
  verification: {
    verified_at: string;
    verification_intent: "authorize" | "inspect_only";
    authorize: boolean;
    verdict: InstitutionalReceiptVerificationResult["verdict"];
    rejection_reasons: string[];
    cryptographically_authentic: boolean;
    currently_authorizable: boolean;
    replay_detected: boolean;
    durable_consumption_recorded: boolean;
  };
  authorization_checks: {
    signature_authentic: boolean;
    issuer_trusted: boolean;
    tenant_scope_ok: boolean;
    policy_binding_ok: boolean;
    lifetime_ok: boolean;
    revocation_state_ok: boolean;
    durable_consumption_ok: boolean;
  };
  provenance: {
    evidence_source: string;
    sdk_package: string;
    operator_command: string;
  };
}

const TELEMETRY_NOTICE =
  "receipt_verification_succeeded and verification_successes are Abraxas-side integration telemetry only. This record is produced by @abraxas/institutional-verification on the relying party host.";

function lacksReason(result: InstitutionalReceiptVerificationResult, code: string): boolean {
  return !result.rejection_reasons.includes(code as never);
}

export function buildExternalVerificationProofRecord(input: {
  result: InstitutionalReceiptVerificationResult;
  verifiedAt: string;
  executionEnvironment: ExternalVerificationExecutionEnvironment;
  sandbox: ExternalVerificationProofRecord["sandbox"];
  receiptId: string;
  requestId: string;
  trustDigestPin: string | null;
  sdkPackage: string;
  evidenceSource: string;
  operatorCommand: string;
  durableConsumptionRecorded: boolean;
  replayDetected: boolean;
}): ExternalVerificationProofRecord {
  const underlying = input.result.underlying;
  const rejection = input.result.rejection_reasons;

  return {
    contract_version: EXTERNAL_VERIFICATION_PROOF_CONTRACT_VERSION,
    proof_kind: "external_sdk_relying_party",
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
      sdk_contract_version: input.result.contract_version,
      verification_contract_version: INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION,
    },
    verification: {
      verified_at: input.verifiedAt,
      verification_intent: input.result.verification_intent,
      authorize: input.result.authorize,
      verdict: input.result.verdict,
      rejection_reasons: [...rejection],
      cryptographically_authentic: underlying.cryptographically_authentic,
      currently_authorizable: underlying.currently_authorizable,
      replay_detected: input.replayDetected,
      durable_consumption_recorded: input.durableConsumptionRecorded,
    },
    authorization_checks: {
      signature_authentic:
        underlying.cryptographically_authentic
        && lacksReason(input.result, "signature_invalid")
        && lacksReason(input.result, "payload_tampered"),
      issuer_trusted:
        lacksReason(input.result, "issuer_untrusted")
        && lacksReason(input.result, "issuer_key_retired"),
      tenant_scope_ok:
        lacksReason(input.result, "tenant_partner_mismatch")
        && lacksReason(input.result, "audience_mismatch"),
      policy_binding_ok: lacksReason(input.result, "tenant_policy_mismatch"),
      lifetime_ok: lacksReason(input.result, "expired"),
      revocation_state_ok:
        lacksReason(input.result, "revoked")
        && lacksReason(input.result, "revocation_unavailable")
        && lacksReason(input.result, "revocation_stale"),
      durable_consumption_ok:
        input.durableConsumptionRecorded
        && !input.replayDetected
        && lacksReason(input.result, "replay_detected")
        && lacksReason(input.result, "durable_store_required"),
    },
    provenance: {
      evidence_source: input.evidenceSource,
      sdk_package: input.sdkPackage,
      operator_command: input.operatorCommand,
    },
  };
}

export function externalVerificationFullyAuthorized(
  proof: ExternalVerificationProofRecord,
): boolean {
  return (
    proof.verification.verification_intent === "authorize"
    && proof.verification.authorize === true
    && proof.verification.verdict === "valid"
    && proof.verification.replay_detected === false
    && proof.verification.durable_consumption_recorded === true
    && Object.values(proof.authorization_checks).every(Boolean)
  );
}
