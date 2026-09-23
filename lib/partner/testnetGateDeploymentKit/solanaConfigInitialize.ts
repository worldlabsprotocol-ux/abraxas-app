import { createHash } from "node:crypto";
import { PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";
import { planSolanaDevnetGateConfig, type DevnetConfigPreflightInput } from "./solanaConfigPreflight";

type Plan = Extract<ReturnType<typeof planSolanaDevnetGateConfig>, { ok: true }>["plan"];

function bytes32(value: string): Buffer {
  if (!/^0x[0-9a-fA-F]{64}$/.test(value)) throw new Error("invalid_public_binding");
  return Buffer.from(value.slice(2), "hex");
}

/** Anchor's Borsh encoding for initialize_config(ConfigParams). Public bindings only. */
export function encodeSolanaGateConfigInitialize(plan: Plan): TransactionInstruction {
  const discriminator = createHash("sha256").update("global:initialize_config").digest().subarray(0, 8);
  const data = Buffer.concat([
    discriminator,
    new PublicKey(plan.partner_program_id).toBuffer(),
    bytes32(plan.trusted_signer),
    bytes32(plan.network_hash),
    bytes32(plan.partner_hash),
    bytes32(plan.policy_hash),
    bytes32(plan.action_hash),
    bytes32(plan.environment_hash),
    bytes32(plan.signer_key_hash),
    Buffer.from([plan.require_subject ? 1 : 0, plan.require_institutional ? 1 : 0]),
    bytes32(plan.expected_organization_commitment),
    bytes32(plan.expected_actor_commitment),
    bytes32(plan.expected_institutional_result_category),
  ]);
  if (data.length !== 362) throw new Error("invalid_instruction_length");
  return new TransactionInstruction({
    programId: new PublicKey(plan.gate_program_id),
    keys: [
      { pubkey: new PublicKey(plan.admin_pubkey), isSigner: true, isWritable: true },
      { pubkey: new PublicKey(plan.gate_config_pda), isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

export function prepareSolanaGateConfigInitialize(input: DevnetConfigPreflightInput) {
  const checked = planSolanaDevnetGateConfig(input);
  if (!checked.ok) return { ...checked, broadcast: false as const };
  const plan = checked.plan;
  const ix = encodeSolanaGateConfigInitialize(plan);
  return {
    ok: true as const,
    packet: {
      network_id: plan.network_id,
      program_id: ix.programId.toBase58(),
      gate_config_pda: plan.gate_config_pda,
      admin_pubkey: plan.admin_pubkey,
      partner_program_id: plan.partner_program_id,
      config_digest: plan.config_digest,
      signer_key_id: plan.signer_key_id,
      trusted_signer: plan.trusted_signer,
      require_subject: plan.require_subject,
      require_institutional: plan.require_institutional,
      instruction_data_base64: ix.data.toString("base64"),
      accounts: ix.keys.map((key) => ({
        pubkey: key.pubkey.toBase58(),
        is_signer: key.isSigner,
        is_writable: key.isWritable,
      })),
      ownership_verified: false as const,
      onchain_config_observed: false as const,
      broadcast: false as const,
    },
  };
}

