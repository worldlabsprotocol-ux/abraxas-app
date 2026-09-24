import type { TransactionInstruction } from "@solana/web3.js";
import { automatedEnvironmentForbidden } from "./deploy";
import { planSolanaDevnetGateConfig, type DevnetConfigPreflightInput } from "./solanaConfigPreflight";
import { prepareSolanaProtocolAccessPacket, encodeSolanaProtocolAccessInitialize } from "./solanaProtocolAccessPacket";
import { inspectSolanaProtocolAccessAfterInitialize } from "./solanaProtocolAccessPostcheck";
import type { PublicSolanaAccountSource, PublicSolanaGenesisSource, ReviewedProgram } from "./solanaDevnetChainPrecheck";

export interface LocalProtocolAccessChain {
  genesis: PublicSolanaGenesisSource;
  readAccount: PublicSolanaAccountSource;
  simulate(ix: TransactionInstruction): Promise<boolean>;
  send(ix: TransactionInstruction): Promise<string>;
  confirm(signature: string): Promise<boolean>;
}

/** One human-signed devnet initialization, never called by an API or automated runtime. */
export async function initializeLocalSolanaProtocolAccess(input: DevnetConfigPreflightInput & {
  confirm: boolean;
  ownershipReviewed: boolean;
  interactive: boolean;
  signerPubkey: string;
  runtimeEnv: NodeJS.ProcessEnv;
  chain: LocalProtocolAccessChain;
  reviewed?: { gate: ReviewedProgram; consumer: ReviewedProgram };
}): Promise<
  | { ok: false; reason: string; broadcast: boolean | "unknown"; signature?: string }
  | { ok: true; network_id: "solana_devnet"; gate_config_pda: string; protocol_config_pda: string;
      config_digest: string; signature: string; protocol_config: "exact_match";
      registered: false; broadcast: true }
> {
  const fail = (reason: string, signature?: string, broadcast: boolean | "unknown" = Boolean(signature)) => ({
    ok: false as const, reason, broadcast, ...(signature ? { signature } : {}),
  });
  if (!input.confirm || !input.ownershipReviewed) return fail("confirmation_required");
  if (!input.interactive || automatedEnvironmentForbidden(input.runtimeEnv)) return fail("automated_environment_forbidden");
  const planned = planSolanaDevnetGateConfig(input);
  if (!planned.ok) return fail(planned.reason);
  if (planned.plan.admin_pubkey !== input.signerPubkey) return fail("admin_key_mismatch");
  const publicChain = { ...input, genesis: input.chain.genesis, readAccount: input.chain.readAccount };
  const first = await prepareSolanaProtocolAccessPacket(publicChain);
  if (!first.ok) return fail(first.reason);
  const ix = encodeSolanaProtocolAccessInitialize(planned.plan);
  try {
    if (!await input.chain.simulate(ix)) return fail("simulation_failed");
  } catch { return fail("simulation_failed"); }
  const second = await prepareSolanaProtocolAccessPacket(publicChain);
  if (!second.ok) return fail(second.reason);
  if (second.packet.config_digest !== first.packet.config_digest
    || second.packet.protocol_config_pda !== first.packet.protocol_config_pda
    || second.packet.instruction_data_base64 !== first.packet.instruction_data_base64) {
    return fail("packet_changed");
  }
  let signature: string;
  try {
    signature = await input.chain.send(ix);
    if (!/^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(signature)) return fail("send_outcome_unknown", undefined, "unknown");
  } catch { return fail("send_outcome_unknown", undefined, "unknown"); }
  try {
    if (!await input.chain.confirm(signature)) return fail("transaction_unconfirmed", signature);
  } catch { return fail("transaction_unconfirmed", signature); }
  const observed = await inspectSolanaProtocolAccessAfterInitialize(publicChain);
  if (!observed.ok) return fail(`postcheck_${observed.reason}`, signature);
  return { ok: true, network_id: "solana_devnet", gate_config_pda: observed.gate_config_pda,
    protocol_config_pda: observed.protocol_config_pda, config_digest: observed.config_digest,
    signature, protocol_config: "exact_match", registered: false, broadcast: true };
}
