import { PublicKey } from "@solana/web3.js";
import { gateConfigDiscriminator, deriveGateConfigPda } from "@/lib/partner/onchainGateDeployments/solanaObserve";
import type { planSolanaDevnetGateConfig } from "./solanaConfigPreflight";

type Plan = Extract<ReturnType<typeof planSolanaDevnetGateConfig>, { ok: true }>["plan"];
const ACCOUNT_LENGTH = 8 + 32 * 10 + 2 + 1 + 4 * 65;

function bytes32(value: string): Buffer {
  return Buffer.from(value.slice(2), "hex");
}

/** Compare every authority-bearing field of an observed Anchor GateConfig with a vetted plan. */
export function verifyObservedGateConfig(plan: Plan, account: { owner: string; data: Uint8Array } | null):
  | { ok: false; reason: "config_missing" | "config_mismatch" | "signer_mismatch" }
  | { ok: true; gate_config_pda: string; config_digest: string; institutional_v2: true; signer_active: true } {
  if (!account) return { ok: false, reason: "config_missing" };
  if (account.owner !== plan.gate_program_id || account.data.length !== ACCOUNT_LENGTH
    || deriveGateConfigPda(plan.gate_program_id, plan.admin_pubkey) !== plan.gate_config_pda) {
    return { ok: false, reason: "config_mismatch" };
  }
  const data = Buffer.from(account.data);
  if (!data.subarray(0, 8).equals(Buffer.from(gateConfigDiscriminator()))) return { ok: false, reason: "config_mismatch" };
  let offset = 8;
  const expected: Buffer[] = [
    new PublicKey(plan.admin_pubkey).toBuffer(),
    new PublicKey(plan.partner_program_id).toBuffer(),
    bytes32(plan.network_hash), bytes32(plan.partner_hash), bytes32(plan.policy_hash),
    bytes32(plan.action_hash), bytes32(plan.environment_hash),
    Buffer.from([1, 1]),
    bytes32(plan.expected_organization_commitment),
    bytes32(plan.expected_actor_commitment),
    bytes32(plan.expected_institutional_result_category),
  ];
  for (const field of expected) {
    if (!data.subarray(offset, offset + field.length).equals(field)) return { ok: false, reason: "config_mismatch" };
    offset += field.length;
  }
  const [, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("gate_config"), new PublicKey(plan.admin_pubkey).toBuffer()],
    new PublicKey(plan.gate_program_id),
  );
  if (data[offset] !== bump) return { ok: false, reason: "config_mismatch" };
  offset += 1;
  const signer = Buffer.concat([bytes32(plan.signer_key_hash), bytes32(plan.trusted_signer), Buffer.from([1])]);
  if (!data.subarray(offset, offset + 65).equals(signer)) return { ok: false, reason: "signer_mismatch" };
  offset += 65;
  if (data.subarray(offset).some((byte) => byte !== 0)) return { ok: false, reason: "signer_mismatch" };
  return { ok: true, gate_config_pda: plan.gate_config_pda, config_digest: plan.config_digest,
    institutional_v2: true, signer_active: true };
}

