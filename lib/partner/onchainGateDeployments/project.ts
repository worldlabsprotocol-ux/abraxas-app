import type { OnchainGateSafeState } from "./contract";
import { institutionalClassFromFlag, institutionalLabel } from "./institutional";
import type { OnchainGateDeploymentRecord, OnchainGatePublicView } from "./types";

export function safeStateFromRecord(record: OnchainGateDeploymentRecord | null): OnchainGateSafeState {
  if (!record) return "no_deployment_registered";
  if (record.status === "revoked" || record.status === "needs_correction") return "unavailable";
  if (record.status === "submitted") return "awaiting_verification";
  if (record.status === "verified_sandbox") return "verified_sandbox";
  if (record.status === "production_review_required" || record.status === "verified_production") {
    return record.status === "verified_production" ? "verified_sandbox" : "production_review_required";
  }
  if (record.status === "signer_update_required") return "signer_update_required";
  if (record.status === "signer_revoked") return "unavailable";
  return "unavailable";
}

export function projectOnchainGatePublic(record: OnchainGateDeploymentRecord): OnchainGatePublicView {
  return {
    deployment_ref: record.deployment_ref,
    gate_type: record.gate_type,
    network_id: record.network_id,
    chain_id: record.chain_id,
    gate_address: record.gate_address,
    bytecode_hash: record.bytecode_hash,
    config_digest: record.config_digest,
    program_id: record.program_id,
    gate_config_pda: record.gate_config_pda,
    program_digest: record.program_digest,
    partner_hash: record.partner_hash,
    policy_hash: record.policy_hash,
    action_hash: record.action_hash,
    environment: record.environment,
    signer_key_id: record.signer_key_id,
    subject_binding_mode: record.subject_binding_mode,
    status: record.status,
    safe_status: safeStateFromRecord(record),
    require_institutional: record.require_institutional === true,
    institutional_class: institutionalClassFromFlag(record.require_institutional === true),
    institutional_label: institutionalLabel(record.require_institutional === true),
    live: false,
    deploys: false,
    circle_settlement: false,
  };
}
