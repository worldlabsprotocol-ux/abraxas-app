import type { TransactionInstruction } from "@solana/web3.js";
import { automatedEnvironmentForbidden } from "./deploy";
import { planSolanaDevnetGateConfig, type DevnetConfigPreflightInput } from "./solanaConfigPreflight";
import { type PublicSolanaAccountSource, type PublicSolanaGenesisSource, type ReviewedProgram } from "./solanaDevnetChainPrecheck";
import { prepareSolanaProtocolAccessPacket, encodeSolanaProtocolAccessInitialize } from "./solanaProtocolAccessPacket";
import { inspectSolanaProtocolAccessAfterInitialize } from "./solanaProtocolAccessPostcheck";

export interface LocalProtocolAccessChain {
  genesis: PublicSolanaGenesisSource;
  readAccount: PublicSolanaAccountSource;
  simulate(ix: TransactionInstruction): Promise<boolean>;
  send(ix: TransactionInstruction): Promise<string>;
  confirm(signature: string): Promise<boolean>;
}

/** Single devnet broadcast path, callable only by the interactive local operator CLI. */
export async function initializeLocalSolanaProtocolAccess(input: DevnetConfigPreflightInput & {
  confirm: boolean;
  ownershipReviewed: boolean;
  interactive: boolean;
  signerPubkey: string;
  runtimeEnv: NodeJS.ProcessEnv;
  chain: LocalProtocolAccessChain;
  /** Test harness only; the CLI never supplies fingerprints. */
  reviewed?: { gate: ReviewedProgram; consumer: ReviewedProgram };
}): Promise<
  | { ok: false; reason: string; broadcast: boolean | "unknown"; signature?: string }
  | { ok: true; network_id: "solana_devnet"; gate_config_pda: string; protocol_config_pda: string;
      config_digest: string; signature: string; gate_config: "exact_match";
      protocol_config: "exact_match"; registered: false; broadcast: true }
> {
  const fail = (reason: string, signature?: string, broadcast: boolean | "unknown" = Boolean(signature)) => ({
    ok: false as const, reason, broadcast, ...(signature ? { signature } : {}),
  });
  if (!input.confirm || !input.ownershipReviewed) return fail("confirmation_required");
  if (!input.interactive || automatedEnvironmentForbidden(input.runtimeEnv)) return fail("automated_environment_forbidden");
  const planned = planSolanaDevnetGateConfig(input);
  if (!planned.ok) return fail(planned.reason);
  if (planned.plan.admin_pubkey !== input.signerPubkey) return fail("admin_key_mismatch");
  const packetInput = {
    ...input, genesis: input.chain.genesis, readAccount: input.chain.readAccount, reviewed: input.reviewed,
  };
  const first = await prepareSolanaProtocolAccessPacket(packetInput);
  if (!first.ok) return fail(first.reason);
  if (first.packet.config_digest !== planned.plan.config_digest) return fail("packet_plan_mismatch");
  const ix = encodeSolanaProtocolAccessInitialize(planned.plan);
  if (first.packet.program_id !== ix.programId.toBase58()
    || first.packet.protocol_config_pda !== ix.keys[2].pubkey.toBase58()
    || first.packet.instruction_data_base64 !== ix.data.toString("base64")) return fail("packet_plan_mismatch");
  try {
    if (!await input.chain.simulate(ix)) return fail("simulation_failed");
  } catch {
    return fail("simulation_failed");
  }
  // Re-observe both reviewed binaries, exact gate bytes, genesis and vacant consumer PDA.
  const second = await prepareSolanaProtocolAccessPacket(packetInput);
  if (!second.ok) return fail(second.reason);
  if (JSON.stringify(second.packet) !== JSON.stringify(first.packet)) return fail("packet_changed");
  let signature: string;
  try {
    signature = await input.chain.send(ix);
    if (!/^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(signature)) {
      return fail("send_outcome_unknown", undefined, "unknown");
    }
  } catch {
    return fail("send_outcome_unknown", undefined, "unknown");
  }
  try {
    if (!await input.chain.confirm(signature)) return fail("transaction_unconfirmed", signature);
  } catch {
    return fail("transaction_unconfirmed", signature);
  }
  const observed = await inspectSolanaProtocolAccessAfterInitialize(packetInput);
  if (!observed.ok) return fail(`postcheck_${observed.reason}`, signature);
  return {
    ok: true, network_id: "solana_devnet", gate_config_pda: observed.gate_config_pda,
    protocol_config_pda: observed.protocol_config_pda, config_digest: observed.config_digest,
    signature, gate_config: "exact_match", protocol_config: "exact_match", registered: false, broadcast: true,
  };
}

