import { DECISION_RECEIPT_SCHEMA_V1_0, DECISION_RECEIPT_SCHEMA_V1_1 } from "./constants";
import { verifyApplicationBindingRef } from "./applicationBinding";
import { verifyEvidenceCommitment, type EvidenceCommitmentEntryV1, type EvidenceCommitmentV1 } from "./evidenceCommitment";
import type { DecisionReceiptRecord } from "../types";

export type VerificationRequirementResult =
  | { status: "pass"; detail: string }
  | { status: "fail"; detail: string; code: string }
  | { status: "skipped"; detail: string };

export type ApplicationBindingPolicy = {
  require_application_binding?: boolean;
  application_binding_ref?: string;
};

export type EvidenceCommitmentPolicy = {
  require_evidence_commitment?: boolean;
  evidence_commitment_manifest?: EvidenceCommitmentEntryV1[];
};

/** Relying party expected ref is never inferred from the receipt. */
export function evaluateApplicationBindingRequirement(input: {
  record: DecisionReceiptRecord;
  policy: ApplicationBindingPolicy;
}): VerificationRequirementResult {
  const required = input.policy.require_application_binding === true;
  const expectedRef = input.policy.application_binding_ref?.trim();

  if (input.record.schema_version === DECISION_RECEIPT_SCHEMA_V1_0) {
    if (required) {
      return {
        status: "fail",
        detail: "Legacy receipt cannot satisfy mandatory application binding.",
        code: "legacy_receipt_insufficient_for_application_binding",
      };
    }
    if (input.record.application_binding_ref != null) {
      return {
        status: "fail",
        detail: "v1.1.0 application binding field on legacy schema receipt.",
        code: "schema_downgrade_rejected",
      };
    }
    return { status: "skipped", detail: "Unscoped legacy receipt; application binding not required." };
  }

  if (input.record.schema_version !== DECISION_RECEIPT_SCHEMA_V1_1) {
    return {
      status: "fail",
      detail: "Unsupported receipt schema for application binding.",
      code: "unsupported_schema_version",
    };
  }

  if (required) {
    if (!expectedRef) {
      return {
        status: "fail",
        detail: "Mandatory application binding but relying party supplied no expected ref.",
        code: "application_binding_expectation_missing",
      };
    }
    const bind = verifyApplicationBindingRef({
      receiptRef: input.record.application_binding_ref,
      expectedRef,
    });
    if (!bind.ok) {
      return { status: "fail", detail: bind.reason, code: bind.reason };
    }
    return { status: "pass", detail: "Application binding ref matches relying party expectation." };
  }

  if (expectedRef) {
    const bind = verifyApplicationBindingRef({
      receiptRef: input.record.application_binding_ref,
      expectedRef,
    });
    if (!bind.ok) {
      return { status: "fail", detail: bind.reason, code: bind.reason };
    }
    return { status: "pass", detail: "Optional application binding verified." };
  }

  return { status: "skipped", detail: "Unscoped workflow; application binding not required." };
}

export function evaluateEvidenceCommitmentRequirement(input: {
  record: DecisionReceiptRecord & { evidence_commitment?: EvidenceCommitmentV1 | null };
  policy: EvidenceCommitmentPolicy;
}): VerificationRequirementResult {
  const required = input.policy.require_evidence_commitment === true;
  const commitment = input.record.evidence_commitment;
  const manifest = input.policy.evidence_commitment_manifest;

  if (input.record.schema_version === DECISION_RECEIPT_SCHEMA_V1_0) {
    if (required) {
      return {
        status: "fail",
        detail: "Legacy receipt cannot satisfy mandatory evidence commitment.",
        code: "legacy_receipt_insufficient_for_evidence_commitment",
      };
    }
    if (commitment != null) {
      return {
        status: "fail",
        detail: "v1.1.0 evidence commitment on legacy schema receipt.",
        code: "schema_downgrade_rejected",
      };
    }
    return { status: "skipped", detail: "Legacy receipt without evidence commitment requirement." };
  }

  if (input.record.schema_version !== DECISION_RECEIPT_SCHEMA_V1_1) {
    return {
      status: "fail",
      detail: "Unsupported receipt schema for evidence commitment.",
      code: "unsupported_schema_version",
    };
  }

  if (required) {
    const ev = verifyEvidenceCommitment({ commitment, manifest });
    if (!ev.ok) {
      return { status: "fail", detail: ev.reason, code: ev.reason };
    }
    return {
      status: "pass",
      detail: "Evidence commitment digest matches manifest (issuance-time set only).",
    };
  }

  if (commitment) {
    const ev = verifyEvidenceCommitment({ commitment, manifest });
    if (!ev.ok) {
      return { status: "fail", detail: ev.reason, code: ev.reason };
    }
    return {
      status: "pass",
      detail: "Optional evidence commitment verified against supplied manifest.",
    };
  }

  return { status: "skipped", detail: "No evidence commitment on receipt." };
}

/** Manifest entries should use opaque UUIDs or issuer-blinded 64-hex refs, not raw PII-shaped values. */
const UUID_LIKE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BLINDED_HEX = /^[a-f0-9]{64}$/;

export function assessManifestReferencePrivacy(entries: EvidenceCommitmentEntryV1[]): VerificationRequirementResult {
  for (const entry of entries) {
    for (const ref of [entry.fact_id, entry.source_credential_id]) {
      if (ref == null || ref === "") continue;
      if (UUID_LIKE.test(ref) || BLINDED_HEX.test(ref)) continue;
      if (ref.includes("@") || ref.length < 16) {
        return {
          status: "fail",
          detail: "Manifest reference appears linkable or non-opaque; use UUID or blinded hex.",
          code: "evidence_manifest_reference_not_opaque",
        };
      }
    }
  }
  return { status: "pass", detail: "Manifest references appear opaque." };
}
