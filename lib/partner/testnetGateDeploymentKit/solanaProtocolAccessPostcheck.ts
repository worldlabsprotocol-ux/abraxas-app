import { createHash } from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import { SOLANA_DEVNET_GENESIS_HASH, type PublicSolanaAccountSource, type PublicSolanaGenesisSource, type ReviewedProgram } from "./solanaDevnetChainPrecheck";
import { planSolanaDevnetGateConfig, type DevnetConfigPreflightInput } from "./solanaConfigPreflight";
import { inspectSolanaGateConfigAfterInitialize } from "./solanaGateConfigPostcheck";
import { encodeSolanaProtocolAccessInitialize } from "./solanaProtocolAccessPacket";

export async function inspectSolanaProtocolAccessAfterInitialize(input: DevnetConfigPreflightInput & {
  genesis: PublicSolanaGenesisSource;
  readAccount: PublicSolanaAccountSource;
  reviewed?: { gate: ReviewedProgram; consumer: ReviewedProgram };
}): Promise<
  | { ok: false; reason: string; broadcast: false }
  | { ok: true; network_id: "solana_devnet"; gate_config_pda: string; protocol_config_pda: string;
      config_digest: string; protocol_config: "exact_match"; registered: false; broadcast: false }
> {
  const fail = (reason: string) => ({ ok: false as const, reason, broadcast: false as const });
  const gate = await inspectSolanaGateConfigAfterInitialize(input);
  if (!gate.ok) return fail(gate.reason);
  const planned = planSolanaDevnetGateConfig(input);
  if (!planned.ok) return fail(planned.reason);
  const plan = planned.plan;
  if (plan.gate_config_pda !== gate.gate_config_pda || plan.config_digest !== gate.config_digest) return fail("postcheck_plan_mismatch");
  const ix = encodeSolanaProtocolAccessInitialize(plan);
  const [protocol, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("protocol_access_config"), new PublicKey(plan.gate_config_pda).toBuffer()],
    ix.programId,
  );
  try {
    const account = await input.readAccount(protocol.toBase58());
    if (!account) return fail("protocol_config_missing");
    if ("unavailable" in account) return fail("rpc_unavailable");
    const discriminator = createHash("sha256").update("account:ProtocolAccessConfig").digest().subarray(0, 8);
    const expected = Buffer.concat([
      discriminator,
      new PublicKey(plan.gate_config_pda).toBuffer(),
      ...[plan.partner_hash, plan.policy_hash, plan.action_hash, plan.environment_hash]
        .map((hash) => Buffer.from(hash.slice(2), "hex")),
      Buffer.from([bump]),
    ]);
    if (account.owner !== plan.partner_program_id || !Buffer.from(account.data).equals(expected)) {
      return fail("protocol_config_mismatch");
    }
    if (await input.genesis() !== SOLANA_DEVNET_GENESIS_HASH) return fail("wrong_cluster");
    return { ok: true, network_id: "solana_devnet", gate_config_pda: plan.gate_config_pda,
      protocol_config_pda: protocol.toBase58(), config_digest: plan.config_digest,
      protocol_config: "exact_match", registered: false, broadcast: false };
  } catch {
    return fail("rpc_unavailable");
  }
}
