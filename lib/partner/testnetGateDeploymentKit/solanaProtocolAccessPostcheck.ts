import { createHash } from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import { SOLANA_DEVNET_GENESIS_HASH, type PublicSolanaAccountSource, type PublicSolanaGenesisSource, type ReviewedProgram } from "./solanaDevnetChainPrecheck";
import { planSolanaDevnetGateConfig, type DevnetConfigPreflightInput } from "./solanaConfigPreflight";
import { inspectSolanaGateConfigAfterInitialize } from "./solanaGateConfigPostcheck";

export type ProtocolAccessObservationInput = DevnetConfigPreflightInput & {
  genesis: PublicSolanaGenesisSource;
  readAccount: PublicSolanaAccountSource;
  reviewed?: { gate: ReviewedProgram; consumer: ReviewedProgram };
};

/** Exact, read-only comparison with the Anchor ProtocolAccessConfig account. */
export async function inspectSolanaProtocolAccessAfterInitialize(input: ProtocolAccessObservationInput): Promise<
  | { ok: false; reason: string; broadcast: false }
  | { ok: true; network_id: "solana_devnet"; gate_config_pda: string; protocol_config_pda: string;
      config_digest: string; gate_config: "exact_match"; protocol_config: "exact_match";
      gate_artifact: "matched"; consumer_artifact: "matched"; registered: false; broadcast: false }
> {
  const fail = (reason: string) => ({ ok: false as const, reason, broadcast: false as const });
  const gate = await inspectSolanaGateConfigAfterInitialize(input);
  if (!gate.ok) return fail(gate.reason);
  const planned = planSolanaDevnetGateConfig(input);
  if (!planned.ok) return fail(planned.reason);
  const plan = planned.plan;
  if (gate.gate_config_pda !== plan.gate_config_pda || gate.config_digest !== plan.config_digest) {
    return fail("postcheck_plan_mismatch");
  }
  try {
    const [pda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("protocol_access_config"), new PublicKey(plan.gate_config_pda).toBuffer()],
      new PublicKey(plan.partner_program_id),
    );
    const account = await input.readAccount(pda.toBase58());
    if (!account) return fail("protocol_config_missing");
    if ("unavailable" in account) return fail("rpc_unavailable");
    if (account.owner !== plan.partner_program_id) return fail("protocol_config_mismatch");
    const discriminator = createHash("sha256").update("account:ProtocolAccessConfig").digest().subarray(0, 8);
    const hashes = [plan.partner_hash, plan.policy_hash, plan.action_hash, plan.environment_hash]
      .map((hash) => Buffer.from(hash.slice(2), "hex"));
    const expected = Buffer.concat([
      discriminator, new PublicKey(plan.gate_config_pda).toBuffer(), ...hashes, Buffer.from([bump]),
    ]);
    if (!Buffer.from(account.data).equals(expected)) return fail("protocol_config_mismatch");
    const genesis = await input.genesis();
    if (!genesis) return fail("rpc_unavailable");
    if (genesis !== SOLANA_DEVNET_GENESIS_HASH) return fail("wrong_cluster");
    return {
      ok: true, network_id: "solana_devnet", gate_config_pda: plan.gate_config_pda,
      protocol_config_pda: pda.toBase58(), config_digest: plan.config_digest,
      gate_config: "exact_match", protocol_config: "exact_match",
      gate_artifact: "matched", consumer_artifact: "matched", registered: false, broadcast: false,
    };
  } catch {
    return fail("rpc_unavailable");
  }
}

