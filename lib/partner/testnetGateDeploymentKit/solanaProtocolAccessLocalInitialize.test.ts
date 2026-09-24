import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { PublicKey } from "@solana/web3.js";
import { solanaProgramElfKeccak, solanaProgramElfSha256 } from "@/lib/partner/onchainGateDeployments/solanaElfDigest";
import { encodeGateConfigAccount, encodeProgramDataAccount, encodeUpgradeableProgramAccount } from "@/lib/partner/onchainGateDeployments/solanaObserve";
import { SOLANA_UPGRADEABLE_LOADER } from "@/lib/partner/onchainGateDeployments/solanaArtifacts";
import { REVIEWED_DEVNET_PROGRAMS, SOLANA_DEVNET_GENESIS_HASH } from "./solanaDevnetChainPrecheck";
import { planSolanaDevnetGateConfig } from "./solanaConfigPreflight";
import { inspectSolanaProtocolAccessAfterInitialize } from "./solanaProtocolAccessPostcheck";
import { initializeLocalSolanaProtocolAccess } from "./solanaProtocolAccessLocalInitialize";

const admin = "28M4TxRGsh5fbo7BDfR7gtdAxbsPjmMJiX8LAU32doHt";
const binding = {
  partnerId: "partner-sandbox-1", applicationId: "app-sandbox-1", adminPubkey: admin,
  signerKeyId: "solana-devnet-signer-1", now: new Date("2026-09-23T00:00:00.000Z"),
  signerDocument: { document: "abraxas_chain_attestation_verification_keys",
    algorithm: "ed25519", environment: "sandbox", keys: [{
      key_id: "solana-devnet-signer-1", algorithm: "ed25519", environment: "sandbox",
      status: "active", public_verifier: `0x${"11".repeat(32)}`,
      allowed_networks: ["solana_devnet"], allowed_gate_types: ["solana"], schema_versions: ["2"],
      not_before: "2020-01-01T00:00:00.000Z", expires_at: "2099-01-01T00:00:00.000Z",
    }] },
};
const planned = planSolanaDevnetGateConfig(binding);
if (!planned.ok) throw new Error(planned.reason);
const plan = planned.plan;
const gateElf = new TextEncoder().encode("gate-consumer-init-test");
const consumerElf = new TextEncoder().encode("consumer-init-test");
const reviewed = {
  gate: { programId: REVIEWED_DEVNET_PROGRAMS.gate.programId, elfBytes: gateElf.length,
    keccak: solanaProgramElfKeccak(gateElf), sha256: solanaProgramElfSha256(gateElf) },
  consumer: { programId: REVIEWED_DEVNET_PROGRAMS.consumer.programId, elfBytes: consumerElf.length,
    keccak: solanaProgramElfKeccak(consumerElf), sha256: solanaProgramElfSha256(consumerElf) },
};
const gateData = "8uZep2zGjgezuooDeqTQfqKXBW3AvQx51WcqKx8dzjK5";
const consumerData = "BWdQjZ58KTjdYUHji7vYNXeTXhB8fi81oqfKyYoG8EGp";
const [gatePda, gateBump] = PublicKey.findProgramAddressSync(
  [Buffer.from("gate_config"), new PublicKey(admin).toBuffer()], new PublicKey(plan.gate_program_id),
);
const [protocolPda, protocolBump] = PublicKey.findProgramAddressSync(
  [Buffer.from("protocol_access_config"), gatePda.toBuffer()], new PublicKey(plan.partner_program_id),
);
const protocolData = Buffer.concat([
  createHash("sha256").update("account:ProtocolAccessConfig").digest().subarray(0, 8),
  gatePda.toBuffer(),
  ...[plan.partner_hash, plan.policy_hash, plan.action_hash, plan.environment_hash]
    .map((hash) => Buffer.from(hash.slice(2), "hex")),
  Buffer.from([protocolBump]),
]);
const signature = "1".repeat(88);

function harness(options: { cluster?: string; simulation?: boolean; sendFails?: boolean;
  occupied?: boolean; changedGate?: boolean; changedProtocol?: boolean } = {}) {
  const gateBytes = Buffer.from(encodeGateConfigAccount({
    admin, partnerProgram: plan.partner_program_id, networkId: plan.network_hash,
    partnerHash: plan.partner_hash, policyHash: plan.policy_hash, actionHash: plan.action_hash,
    environment: plan.environment_hash, requireSubject: true, requireInstitutional: true,
    bump: gateBump, signerKeyId: plan.signer_key_hash, signerPubkey: plan.trusted_signer,
  }));
  if (options.changedGate) gateBytes[40] ^= 1;
  const accounts = new Map([
    [plan.gate_program_id, { owner: SOLANA_UPGRADEABLE_LOADER, data: encodeUpgradeableProgramAccount(gateData) }],
    [gateData, { owner: SOLANA_UPGRADEABLE_LOADER, data: encodeProgramDataAccount(gateElf, admin) }],
    [plan.partner_program_id, { owner: SOLANA_UPGRADEABLE_LOADER, data: encodeUpgradeableProgramAccount(consumerData) }],
    [consumerData, { owner: SOLANA_UPGRADEABLE_LOADER, data: encodeProgramDataAccount(consumerElf, admin) }],
    [gatePda.toBase58(), { owner: plan.gate_program_id, data: gateBytes }],
  ]);
  if (options.occupied) accounts.set(protocolPda.toBase58(), { owner: plan.partner_program_id, data: protocolData });
  let simulations = 0; let sends = 0; let confirms = 0;
  const chain = {
    genesis: async () => options.cluster ?? SOLANA_DEVNET_GENESIS_HASH,
    readAccount: async (key: string) => accounts.get(key) ?? null,
    simulate: async () => { simulations += 1; return options.simulation !== false; },
    send: async () => { sends += 1; if (options.sendFails) throw new Error("network"); return signature; },
    confirm: async () => { confirms += 1; const data = Buffer.from(protocolData);
      if (options.changedProtocol) data[40] ^= 1;
      accounts.set(protocolPda.toBase58(), { owner: plan.partner_program_id, data }); return true; },
  };
  const execute = (extra: Record<string, unknown> = {}) => initializeLocalSolanaProtocolAccess({
    ...binding, reviewed, confirm: true, ownershipReviewed: true,
    interactive: true, signerPubkey: admin, runtimeEnv: {}, chain, ...extra,
  });
  const inspect = () => inspectSolanaProtocolAccessAfterInitialize({ ...binding, reviewed,
    genesis: chain.genesis, readAccount: chain.readAccount });
  return { execute, inspect, counters: () => ({ simulations, sends, confirms }) };
}

describe("human-only Solana devnet protocol-access initialization", () => {
  it("simulates, rechecks, sends once, finalizes and compares the exact consumer account", async () => {
    const run = harness();
    expect(await run.execute()).toMatchObject({ ok: true, network_id: "solana_devnet",
      protocol_config_pda: protocolPda.toBase58(), config_digest: plan.config_digest,
      signature, gate_config: "exact_match", protocol_config: "exact_match", registered: false, broadcast: true });
    expect(run.counters()).toEqual({ simulations: 1, sends: 1, confirms: 1 });
    expect(await run.inspect()).toMatchObject({ ok: true, protocol_config: "exact_match", broadcast: false });
  });
  it("refuses automation, absent confirmation, and wrong admin before simulation", async () => {
    const run = harness();
    expect(await run.execute({ confirm: false })).toMatchObject({ ok: false, reason: "confirmation_required", broadcast: false });
    expect(await run.execute({ runtimeEnv: { CI: "true" } })).toMatchObject({ ok: false, reason: "automated_environment_forbidden", broadcast: false });
    expect(await run.execute({ signerPubkey: "wrong" })).toMatchObject({ ok: false, reason: "admin_key_mismatch", broadcast: false });
    expect(run.counters()).toEqual({ simulations: 0, sends: 0, confirms: 0 });
  });
  it("cannot broadcast on wrong cluster, changed gate, occupied consumer or failed simulation", async () => {
    for (const options of [{ cluster: "mainnet" }, { changedGate: true }, { occupied: true }, { simulation: false }]) {
      const run = harness(options);
      expect(await run.execute()).toMatchObject({ ok: false, broadcast: false });
      expect(run.counters().sends).toBe(0);
    }
  });
  it("treats send errors as unknown and finalized mismatches as broadcast failures", async () => {
    const send = harness({ sendFails: true });
    expect(await send.execute()).toEqual({ ok: false, reason: "send_outcome_unknown", broadcast: "unknown" });
    const changed = harness({ changedProtocol: true });
    expect(await changed.execute()).toMatchObject({ ok: false,
      reason: "postcheck_protocol_config_mismatch", signature, broadcast: true });
  });
});

