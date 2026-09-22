import { INSTITUTIONAL_V2_LABEL } from "@/lib/partner/onchainGateDeployments/institutionalClass";
import { SOLANA_GATE_V2_RELEASE } from "@/lib/partner/onchainGateDeployments/solanaV2Release";
import { LOCALNET_SOLANA_PROGRAM_IDS } from "./contract";
import type { OperatorHandoff, TestnetGateKitEnvelope } from "./types";

export function operatorHandoffFromPlan(envelope: TestnetGateKitEnvelope): OperatorHandoff {
  const solana = envelope.gate_type === "solana";
  return {
    live: false,
    broadcast: false,
    cluster: solana ? "solana_devnet" : "evm_sepolia",
    require_institutional: true,
    institutional_class: "institutional_v2",
    institutional_label: INSTITUTIONAL_V2_LABEL,
    expected_program_ids: solana
      ? {
          eligibility_gate: LOCALNET_SOLANA_PROGRAM_IDS.abraxas_eligibility_gate,
          protocol_access: LOCALNET_SOLANA_PROGRAM_IDS.abraxas_protocol_access,
          source: "anchor_toml_localnet",
        }
      : undefined,
    gate_config: {
      require_institutional: true,
      expected_organization_commitment: "0x0000000000000000000000000000000000000000000000000000000000000000",
      expected_actor_commitment: "0x0000000000000000000000000000000000000000000000000000000000000000",
      expected_institutional_result_category: "0x0000000000000000000000000000000000000000000000000000000000000000",
      subject_binding_mode: "required",
      note: "Reusable gate. Organization, actor, category, subject, and expiry are attestation-only.",
    },
    pda_derivation: {
      gate_config: ["gate_config", "admin"],
      authorization: ["authorization", "config", "attestation_id"],
      entitlement: ["protocol_access", "protocol", "subject_hash", "organization_commitment"],
    },
    public_verifier: envelope.institutional?.public_verifier ?? "unspecified",
    signer_key_id: envelope.bindings.signer_key_id,
    bytecode_digest: envelope.institutional?.bytecode_digest ?? (`0x${"00".repeat(32)}` as `0x${string}`),
    kit_digest: envelope.kit_digest,
    registry_manifest_template: solana
      ? {
          schema_version: "1",
          gate_type: "solana",
          network_id: "solana_devnet",
          program_id: "{{PROGRAM_ID}}",
          gate_config_pda: "{{GATE_CONFIG_PDA}}",
          program_digest: "{{PROGRAM_DIGEST}}",
          config_digest: "{{CONFIG_DIGEST}}",
          partner_hash: envelope.partner_hash,
          policy_hash: envelope.policy_hash,
          action_hash: envelope.action_hash,
          action_type: envelope.bindings.action_type,
          action_scope: envelope.bindings.action_scope,
          environment: "sandbox",
          signer_key_id: envelope.bindings.signer_key_id,
          subject_binding_mode: "required",
        }
      : {
          schema_version: "1",
          gate_type: "evm",
          network_id: "evm_sepolia",
          gate_address: "{{GATE_ADDRESS}}",
          bytecode_hash: "{{BYTECODE_HASH}}",
          config_digest: "{{CONFIG_DIGEST}}",
        },
    verify_command: "npm run abraxas-gate -- verify ./deployment-manifest.json",
    register_command: "npm run abraxas-gate -- register ./deployment-manifest.json",
    rollback: "Do not register. Admin revoke_trusted_signer on-chain. Registry: revokeOnchainGateDeployment or Launchpad POST { revoke: true, deployment_ref }. Never move funds.",
    operator_deploys_with: "local_solana_toolchain",
    reviewed_solana_v2_artifact: solana
      ? {
          artifact_id: SOLANA_GATE_V2_RELEASE.artifact_id,
          program_data_digest: SOLANA_GATE_V2_RELEASE.program_data_digest,
          elf_sha256: SOLANA_GATE_V2_RELEASE.elf_sha256,
          provenance_ref: SOLANA_GATE_V2_RELEASE.provenance_ref,
          status: "approved",
          operator_must_match_digest_before_verify: true,
          deploy_button: false,
        }
      : undefined,
  };
}
