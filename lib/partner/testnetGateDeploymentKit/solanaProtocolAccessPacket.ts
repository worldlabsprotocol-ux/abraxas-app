import { createHash } from "node:crypto";
import { PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";
import { SOLANA_DEVNET_GENESIS_HASH, type PublicSolanaAccountSource, type PublicSolanaGenesisSource, type ReviewedProgram } from "./solanaDevnetChainPrecheck";
import { planSolanaDevnetGateConfig, type DevnetConfigPreflightInput } from "./solanaConfigPreflight";
import { inspectSolanaGateConfigAfterInitialize } from "./solanaGateConfigPostcheck";

type Plan = Extract<ReturnType<typeof planSolanaDevnetGateConfig>, { ok: true }>["plan"];

export function encodeSolanaProtocolAccessInitialize(plan: Plan): TransactionInstruction {
  const [protocol] = PublicKey.findProgramAddressSync(
    [Buffer.from("protocol_access_config"), new PublicKey(plan.gate_config_pda).toBuffer()],
    new PublicKey(plan.partner_program_id),
  );
  const discriminator = createHash("sha256").update("global:initialize_protocol_access").digest().subarray(0, 8);
  const hashes = [plan.partner_hash, plan.policy_hash, plan.action_hash, plan.environment_hash].map((hash) => {
    if (!/^0x[0-9a-f]{64}$/.test(hash)) throw new Error("invalid_public_binding");
    return Buffer.from(hash.slice(2), "hex");
  });
  const data = Buffer.concat([discriminator, ...hashes]);
  if (data.length !== 136) throw new Error("invalid_instruction_length");
  return new TransactionInstruction({
    programId: new PublicKey(plan.partner_program_id),
    keys: [
      { pubkey: new PublicKey(plan.admin_pubkey), isSigner: true, isWritable: true },
      { pubkey: new PublicKey(plan.gate_config_pda), isSigner: false, isWritable: false },
      { pubkey: protocol, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/** Read-only consumer initialization packet after exact live gate and reviewed ELF checks. */
export async function prepareSolanaProtocolAccessPacket(input: DevnetConfigPreflightInput & {
  genesis: PublicSolanaGenesisSource;
  readAccount: PublicSolanaAccountSource;
  reviewed?: { gate: ReviewedProgram; consumer: ReviewedProgram };
}): Promise<
  | { ok: false; reason: string; broadcast: false }
  | { ok: true; packet: {
      network_id: "solana_devnet"; gate_config_pda: string; protocol_config_pda: string;
      program_id: string; config_digest: string; instruction_data_base64: string;
      accounts: Array<{ pubkey: string; is_signer: boolean; is_writable: boolean }>;
      gate_config: "exact_match"; protocol_config: "uninitialized";
      registered: false; broadcast: false;
    } }
> {
  const fail = (reason: string) => ({ ok: false as const, reason, broadcast: false as const });
  const observed = await inspectSolanaGateConfigAfterInitialize(input);
  if (!observed.ok) return fail(observed.reason);
  const planned = planSolanaDevnetGateConfig(input);
  if (!planned.ok) return fail(planned.reason);
  const plan = planned.plan;
  if (observed.gate_config_pda !== plan.gate_config_pda || observed.config_digest !== plan.config_digest) {
    return fail("postcheck_plan_mismatch");
  }
  const ix = encodeSolanaProtocolAccessInitialize(plan);
  const protocolPda = ix.keys[2].pubkey.toBase58();
  try {
    const account = await input.readAccount(protocolPda);
    if (account && "unavailable" in account) return fail("rpc_unavailable");
    if (account) return fail("protocol_config_already_initialized");
    if (await input.genesis() !== SOLANA_DEVNET_GENESIS_HASH) return fail("wrong_cluster");
  } catch {
    return fail("rpc_unavailable");
  }
  return { ok: true, packet: {
    network_id: "solana_devnet", gate_config_pda: plan.gate_config_pda,
    protocol_config_pda: protocolPda, program_id: ix.programId.toBase58(),
    config_digest: plan.config_digest, instruction_data_base64: ix.data.toString("base64"),
    accounts: ix.keys.map((key) => ({ pubkey: key.pubkey.toBase58(), is_signer: key.isSigner, is_writable: key.isWritable })),
    gate_config: "exact_match", protocol_config: "uninitialized", registered: false, broadcast: false,
  } };
}
