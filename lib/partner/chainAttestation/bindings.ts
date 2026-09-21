// FILE: lib/partner/chainAttestation/bindings.ts
// Partner-side validation of chain attestation bindings. Fail closed.

import type { ChainEligibilityAttestationFields } from "./contract";
import { ZERO_BYTES32 } from "./contract";

export type BindingFailure =
  | "partner_mismatch"
  | "policy_mismatch"
  | "action_mismatch"
  | "network_disabled"
  | "expired"
  | "wallet_binding_missing"
  | "institutional_required"
  | "invalid";

export function assertAttestationBindings(input: {
  fields: ChainEligibilityAttestationFields;
  expected: {
    partnerHash: `0x${string}`;
    policyHash: `0x${string}`;
    actionHash: `0x${string}`;
    networkId: `0x${string}`;
    environment: `0x${string}`;
    requireSubject: boolean;
    requireInstitutional?: boolean;
    organizationCommitment?: `0x${string}`;
    actorCommitment?: `0x${string}`;
    institutionalResultCategory?: `0x${string}`;
  };
  nowSeconds: number;
}): { ok: true } | { ok: false; reason: BindingFailure } {
  const { fields, expected } = input;
  if (fields.partnerHash.toLowerCase() !== expected.partnerHash.toLowerCase()) {
    return { ok: false, reason: "partner_mismatch" };
  }
  if (fields.policyHash.toLowerCase() !== expected.policyHash.toLowerCase()) {
    return { ok: false, reason: "policy_mismatch" };
  }
  if (fields.actionHash.toLowerCase() !== expected.actionHash.toLowerCase()) {
    return { ok: false, reason: "action_mismatch" };
  }
  if (fields.networkId.toLowerCase() !== expected.networkId.toLowerCase()) {
    return { ok: false, reason: "network_disabled" };
  }
  if (fields.environment.toLowerCase() !== expected.environment.toLowerCase()) {
    return { ok: false, reason: "invalid" };
  }
  if (input.nowSeconds >= fields.expiresAt) return { ok: false, reason: "expired" };
  if (expected.requireSubject && fields.subjectHash.toLowerCase() === ZERO_BYTES32) {
    return { ok: false, reason: "wallet_binding_missing" };
  }
  if (expected.requireInstitutional) {
    if (
      fields.organizationCommitment.toLowerCase() === ZERO_BYTES32
      || fields.actorCommitment.toLowerCase() === ZERO_BYTES32
      || fields.institutionalResultCategory.toLowerCase() === ZERO_BYTES32
    ) {
      return { ok: false, reason: "institutional_required" };
    }
    if (expected.organizationCommitment && fields.organizationCommitment.toLowerCase() !== expected.organizationCommitment.toLowerCase()) {
      return { ok: false, reason: "invalid" };
    }
    if (expected.actorCommitment && fields.actorCommitment.toLowerCase() !== expected.actorCommitment.toLowerCase()) {
      return { ok: false, reason: "invalid" };
    }
    if (expected.institutionalResultCategory && fields.institutionalResultCategory.toLowerCase() !== expected.institutionalResultCategory.toLowerCase()) {
      return { ok: false, reason: "invalid" };
    }
  }
  return { ok: true };
}
