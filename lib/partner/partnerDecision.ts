// FILE: lib/partner/partnerDecision.ts
// Partner-facing decision envelope for verify endpoints.

import type { VerificationResult } from "@/lib/credentials/types";
import type { VerifierResponse } from "@/lib/verifyRegistry";
import type { VerificationAction } from "@/lib/verification/checkLevel";
import { randomUUID } from "crypto";

export type PartnerDecision = "approved" | "denied" | "manual_review";
export type RecordStatus = "active" | "expired" | "revoked" | "not_found";

export interface PartnerVerifyResponse {
  decision: PartnerDecision;
  status: RecordStatus;
  assurance_level: number;
  policy_id: string;
  policy_version: string;
  decision_reference: string;
  valid_until: string | null;
  record_id?: string;
  record_type?: string;
  /** Legacy credential fields — retained for existing integrators */
  verified?: boolean;
  credential_jti?: string;
  holder_address?: string;
  sui_address?: string;
  jurisdiction?: string;
  verification_level?: VerificationResult["verification_level"];
  error?: string;
}

export const DEFAULT_POLICY_ID = "abraxas-verify-v1";
export const DEFAULT_POLICY_VERSION = "2026-07-08";

export function decisionReference(partnerId: string): string {
  const slug = partnerId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12) || "anon";
  return `abx-dec-${slug}-${randomUUID().slice(0, 8)}`;
}

export function envelopeFromRegistry(
  result: VerifierResponse,
  policyId: string,
  partnerId: string,
): PartnerVerifyResponse {
  const ref = decisionReference(partnerId);
  if (result.state === "RESOLVED_VALID") {
    return {
      decision: "approved",
      status: "active",
      assurance_level: result.assurance_level,
      policy_id: policyId,
      policy_version: DEFAULT_POLICY_VERSION,
      decision_reference: ref,
      valid_until: result.last_sync_timestamp ?? null,
      record_id: result.query,
      record_type: result.resolved_type,
      verified: true,
    };
  }
  if (result.state === "RESOLVED_REVOKED") {
    return {
      decision: "denied",
      status: "revoked",
      assurance_level: result.assurance_level,
      policy_id: policyId,
      policy_version: DEFAULT_POLICY_VERSION,
      decision_reference: ref,
      valid_until: null,
      record_id: result.query,
      record_type: result.resolved_type,
      verified: false,
      error: result.revocation_reason_code ?? "revoked",
    };
  }
  return {
    decision: "denied",
    status: "not_found",
    assurance_level: 0,
    policy_id: policyId,
    policy_version: DEFAULT_POLICY_VERSION,
    decision_reference: ref,
    valid_until: null,
    record_id: result.query,
    record_type: result.resolved_type,
    verified: false,
    error: "record_not_found",
  };
}

export function envelopeFromCredential(
  result: VerificationResult,
  policyId: string,
  partnerId: string,
): PartnerVerifyResponse {
  const ref = decisionReference(partnerId);
  if (result.verified) {
    return {
      decision: "approved",
      status: "active",
      assurance_level: result.verification_level === "enhanced" ? 3 : result.verification_level === "standard" ? 2 : 1,
      policy_id: policyId,
      policy_version: DEFAULT_POLICY_VERSION,
      decision_reference: ref,
      valid_until: result.expires_at ?? null,
      record_type: "credential_jwt",
      verified: true,
      credential_jti: result.credential_jti,
      holder_address: result.holder_address,
      sui_address: result.sui_address,
      jurisdiction: result.jurisdiction,
      verification_level: result.verification_level,
    };
  }

  const status: RecordStatus = result.error?.includes("expired")
    ? "expired"
    : result.error?.includes("revoked")
      ? "revoked"
      : "not_found";

  return {
    decision: "denied",
    status,
    assurance_level: 0,
    policy_id: policyId,
    policy_version: DEFAULT_POLICY_VERSION,
    decision_reference: ref,
    valid_until: null,
    record_type: "credential_jwt",
    verified: false,
    credential_jti: result.credential_jti,
    holder_address: result.holder_address,
    sui_address: result.sui_address,
    error: result.error,
  };
}

export function envelopeFromPolicyCheck(
  input: {
    decision: string;
    policy_id?: string;
    currentLevel?: string;
  },
  partnerId: string,
  action: VerificationAction,
): PartnerVerifyResponse {
  const ref = decisionReference(partnerId);
  const policyId = input.policy_id ?? DEFAULT_POLICY_ID;
  const decision = input.decision as PartnerDecision;
  const level = input.currentLevel === "verified" ? 2 : input.currentLevel === "compliance_started" ? 1 : 0;

  return {
    decision: decision === "approved" || decision === "manual_review" ? decision : "denied",
    status: decision === "approved" ? "active" : "not_found",
    assurance_level: level,
    policy_id: policyId,
    policy_version: DEFAULT_POLICY_VERSION,
    decision_reference: ref,
    valid_until: null,
    record_type: "policy_check",
    record_id: action,
    verified: decision === "approved",
    error: decision === "denied" ? "policy_denied" : undefined,
  };
}
