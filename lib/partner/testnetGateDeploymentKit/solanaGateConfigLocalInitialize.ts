import type { TransactionInstruction } from "@solana/web3.js";
import { automatedEnvironmentForbidden } from "./deploy";
import { planSolanaDevnetGateConfig, type DevnetConfigPreflightInput } from "./solanaConfigPreflight";
import { encodeSolanaGateConfigInitialize } from "./solanaConfigInitialize";
import { inspectSolanaDevnetBeforeConfig, type PublicSolanaAccountSource, type PublicSolanaGenesisSource, type ReviewedProgram } from "./solanaDevnetChainPrecheck";
import { inspectSolanaGateConfigAfterInitialize } from "./solanaGateConfigPostcheck";

export interface LocalGateConfigChain {
  genesis: PublicSolanaGenesisSource;
  readAccount: PublicSolanaAccountSource;
  simulate(ix: TransactionInstruction): Promise<boolean>;
  send(ix: TransactionInstruction): Promise<string>;
  confirm(signature: string): Promise<boolean>;
}

/** The only broadcast path for GateConfig. Caller must be a local interactive operator CLI. */
export async function initializeLocalSolanaGateConfig(input: DevnetConfigPreflightInput & {
  confirm: boolean;
  ownershipReviewed: boolean;
  interactive: boolean;
  signerPubkey: string;
  runtimeEnv: NodeJS.ProcessEnv;
  chain: LocalGateConfigChain;
  /** Test harness only. The operator CLI never passes fingerprints. */
  reviewed?: { gate: ReviewedProgram; consumer: ReviewedProgram };
}): Promise<
  | { ok: false; reason: string; broadcast: boolean | "unknown"; signature?: string }
  | { ok: true; network_id: "solana_devnet"; gate_config_pda: string; config_digest: string;
      signature: string; gate_config: "exact_match"; registry_status: "not_registered"; broadcast: true }
> {
  const fail = (reason: string, signature?: string, broadcast: boolean | "unknown" = Boolean(signature)) => ({
    ok: false as const, reason, broadcast, ...(signature ? { signature } : {}),
  });
  if (!input.confirm || !input.ownershipReviewed) return fail("confirmation_required");
  if (!input.interactive || automatedEnvironmentForbidden(input.runtimeEnv)) return fail("automated_environment_forbidden");
  const planned = planSolanaDevnetGateConfig(input);
  if (!planned.ok) return fail(planned.reason);
  if (planned.plan.admin_pubkey !== input.signerPubkey) return fail("admin_key_mismatch");
  const ix = encodeSolanaGateConfigInitialize(planned.plan);
  const publicChain = { adminPubkey: planned.plan.admin_pubkey,
    genesis: input.chain.genesis, readAccount: input.chain.readAccount, reviewed: input.reviewed };
  const first = await inspectSolanaDevnetBeforeConfig(publicChain);
  if (!first.ok) return fail(first.reason);
  try {
    if (!await input.chain.simulate(ix)) return fail("simulation_failed");
  } catch {
    return fail("simulation_failed");
  }
  // Re-read both reviewed ELFs, cluster, and the vacant PDA after simulation.
  const second = await inspectSolanaDevnetBeforeConfig(publicChain);
  if (!second.ok) return fail(second.reason);
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
  const observed = await inspectSolanaGateConfigAfterInitialize({ ...input,
    genesis: input.chain.genesis, readAccount: input.chain.readAccount, reviewed: input.reviewed });
  if (!observed.ok) return fail(`postcheck_${observed.reason}`, signature);
  return {
    ok: true, network_id: "solana_devnet", gate_config_pda: observed.gate_config_pda,
    config_digest: observed.config_digest, signature, gate_config: "exact_match",
    registry_status: "not_registered", broadcast: true,
  };
}
