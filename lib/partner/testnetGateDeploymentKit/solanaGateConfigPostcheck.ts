import { PublicKey } from "@solana/web3.js";
import { encodeGateConfigAccount } from "@/lib/partner/onchainGateDeployments/solanaObserve";
import {
  inspectProgram, REVIEWED_DEVNET_PROGRAMS, SOLANA_DEVNET_GENESIS_HASH,
  type PublicSolanaAccountSource, type PublicSolanaGenesisSource, type ReviewedProgram,
} from "./solanaDevnetChainPrecheck";
import { planSolanaDevnetGateConfig, type DevnetConfigPreflightInput } from "./solanaConfigPreflight";

/** Exact, read-only comparison after a human initializes the devnet GateConfig. */
export async function inspectSolanaGateConfigAfterInitialize(input: DevnetConfigPreflightInput & {
  genesis: PublicSolanaGenesisSource;
  readAccount: PublicSolanaAccountSource;
  reviewed?: { gate: ReviewedProgram; consumer: ReviewedProgram };
}): Promise<
  | { ok: false; reason: string; broadcast: false }
  | { ok: true; network_id: "solana_devnet"; gate_config_pda: string; config_digest: string;
      gate_artifact: "matched"; consumer_artifact: "matched"; gate_config: "exact_match";
      registry_status: "not_registered"; broadcast: false }
> {
  const fail = (reason: string) => ({ ok: false as const, reason, broadcast: false as const });
  const planned = planSolanaDevnetGateConfig(input);
  if (!planned.ok) return fail(planned.reason);
  const plan = planned.plan;
  const reviewed = input.reviewed ?? REVIEWED_DEVNET_PROGRAMS;
  if (reviewed.gate.programId !== plan.gate_program_id || reviewed.consumer.programId !== plan.partner_program_id) {
    return fail("program_mismatch");
  }
  try {
    const before = await input.genesis();
    if (!before) return fail("rpc_unavailable");
    if (before !== SOLANA_DEVNET_GENESIS_HASH) return fail("wrong_cluster");
    const gate = await inspectProgram(reviewed.gate, input.readAccount);
    if (gate !== "matched") return fail(gate === "unavailable" ? "rpc_unavailable" : "gate_artifact_mismatch");
    const consumer = await inspectProgram(reviewed.consumer, input.readAccount);
    if (consumer !== "matched") return fail(consumer === "unavailable" ? "rpc_unavailable" : "consumer_artifact_mismatch");
    const account = await input.readAccount(plan.gate_config_pda);
    if (!account) return fail("gate_config_missing");
    if ("unavailable" in account) return fail("rpc_unavailable");
    const [derived, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("gate_config"), new PublicKey(plan.admin_pubkey).toBuffer()],
      new PublicKey(plan.gate_program_id),
    );
    if (derived.toBase58() !== plan.gate_config_pda || account.owner !== plan.gate_program_id) {
      return fail("gate_config_mismatch");
    }
    const expected = encodeGateConfigAccount({
      admin: plan.admin_pubkey,
      partnerProgram: plan.partner_program_id,
      networkId: plan.network_hash,
      partnerHash: plan.partner_hash,
      policyHash: plan.policy_hash,
      actionHash: plan.action_hash,
      environment: plan.environment_hash,
      requireSubject: true,
      requireInstitutional: true,
      bump,
      signerKeyId: plan.signer_key_hash,
      signerPubkey: plan.trusted_signer,
    });
    if (!Buffer.from(account.data).equals(Buffer.from(expected))) return fail("gate_config_mismatch");
    const after = await input.genesis();
    if (!after) return fail("rpc_unavailable");
    if (after !== SOLANA_DEVNET_GENESIS_HASH) return fail("wrong_cluster");
    return {
      ok: true, network_id: "solana_devnet", gate_config_pda: plan.gate_config_pda,
      config_digest: plan.config_digest, gate_artifact: "matched", consumer_artifact: "matched",
      gate_config: "exact_match", registry_status: "not_registered", broadcast: false,
    };
  } catch {
    return fail("rpc_unavailable");
  }
}
