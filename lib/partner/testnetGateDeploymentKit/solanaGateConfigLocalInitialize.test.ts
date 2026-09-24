import { describe, expect, it } from "vitest";
import { PublicKey } from "@solana/web3.js";
import { solanaProgramElfKeccak, solanaProgramElfSha256 } from "@/lib/partner/onchainGateDeployments/solanaElfDigest";
import { encodeGateConfigAccount, encodeProgramDataAccount, encodeUpgradeableProgramAccount } from "@/lib/partner/onchainGateDeployments/solanaObserve";
import { SOLANA_UPGRADEABLE_LOADER } from "@/lib/partner/onchainGateDeployments/solanaArtifacts";
import { REVIEWED_DEVNET_PROGRAMS, SOLANA_DEVNET_GENESIS_HASH } from "./solanaDevnetChainPrecheck";
import { planSolanaDevnetGateConfig } from "./solanaConfigPreflight";
import { initializeLocalSolanaGateConfig } from "./solanaGateConfigLocalInitialize";

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
const gateElf = new TextEncoder().encode("gate-local-init-test");
const consumerElf = new TextEncoder().encode("consumer-local-init-test");
const reviewed = {
  gate: { programId: REVIEWED_DEVNET_PROGRAMS.gate.programId, elfBytes: gateElf.length,
    keccak: solanaProgramElfKeccak(gateElf), sha256: solanaProgramElfSha256(gateElf) },
  consumer: { programId: REVIEWED_DEVNET_PROGRAMS.consumer.programId, elfBytes: consumerElf.length,
    keccak: solanaProgramElfKeccak(consumerElf), sha256: solanaProgramElfSha256(consumerElf) },
};
const gateData = "8uZep2zGjgezuooDeqTQfqKXBW3AvQx51WcqKx8dzjK5";
const consumerData = "BWdQjZ58KTjdYUHji7vYNXeTXhB8fi81oqfKyYoG8EGp";
const signature = "1".repeat(88);

function harness(options: { cluster?: string; simulation?: boolean; sendFails?: boolean; occupied?: boolean } = {}) {
  const accounts = new Map([
    [plan.gate_program_id, { owner: SOLANA_UPGRADEABLE_LOADER, data: encodeUpgradeableProgramAccount(gateData) }],
    [gateData, { owner: SOLANA_UPGRADEABLE_LOADER, data: encodeProgramDataAccount(gateElf, admin) }],
    [plan.partner_program_id, { owner: SOLANA_UPGRADEABLE_LOADER, data: encodeUpgradeableProgramAccount(consumerData) }],
    [consumerData, { owner: SOLANA_UPGRADEABLE_LOADER, data: encodeProgramDataAccount(consumerElf, admin) }],
  ]);
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("gate_config"), new PublicKey(admin).toBuffer()], new PublicKey(plan.gate_program_id),
  );
  const config = { owner: plan.gate_program_id, data: encodeGateConfigAccount({
    admin, partnerProgram: plan.partner_program_id, networkId: plan.network_hash,
    partnerHash: plan.partner_hash, policyHash: plan.policy_hash, actionHash: plan.action_hash,
    environment: plan.environment_hash, requireSubject: true, requireInstitutional: true,
    bump, signerKeyId: plan.signer_key_hash, signerPubkey: plan.trusted_signer,
  }) };
  if (options.occupied) accounts.set(pda.toBase58(), config);
  let simulations = 0; let sends = 0; let confirms = 0;
  const chain = {
    genesis: async () => options.cluster ?? SOLANA_DEVNET_GENESIS_HASH,
    readAccount: async (key: string) => accounts.get(key) ?? null,
    simulate: async () => { simulations += 1; return options.simulation !== false; },
    send: async () => { sends += 1; if (options.sendFails) throw new Error("network"); return signature; },
    confirm: async () => { confirms += 1; accounts.set(pda.toBase58(), config); return true; },
  };
  const execute = (extra: Record<string, unknown> = {}) => initializeLocalSolanaGateConfig({
    ...binding, reviewed, confirm: true, ownershipReviewed: true,
    interactive: true, signerPubkey: admin, runtimeEnv: {}, chain, ...extra,
  });
  return { execute, counters: () => ({ simulations, sends, confirms }) };
}

describe("human-only Solana devnet GateConfig initialization", () => {
  it("simulates, rechecks, broadcasts once, finalizes, and verifies exact account bytes", async () => {
    const run = harness();
    expect(await run.execute()).toMatchObject({ ok: true, network_id: "solana_devnet",
      gate_config_pda: plan.gate_config_pda, config_digest: plan.config_digest,
      signature, gate_config: "exact_match", registry_status: "not_registered", broadcast: true });
    expect(run.counters()).toEqual({ simulations: 1, sends: 1, confirms: 1 });
  });
  it("cannot sign from automation, without confirmation, or with the wrong admin", async () => {
    const run = harness();
    expect(await run.execute({ confirm: false })).toMatchObject({ ok: false, reason: "confirmation_required", broadcast: false });
    expect(await run.execute({ runtimeEnv: { CI: "true" } })).toMatchObject({ ok: false, reason: "automated_environment_forbidden", broadcast: false });
    expect(await run.execute({ interactive: false })).toMatchObject({ ok: false, reason: "automated_environment_forbidden", broadcast: false });
    expect(await run.execute({ signerPubkey: "wrong" })).toMatchObject({ ok: false, reason: "admin_key_mismatch", broadcast: false });
    expect(run.counters()).toEqual({ simulations: 0, sends: 0, confirms: 0 });
  });
  it("does not broadcast on wrong cluster, occupied PDA, or failed simulation", async () => {
    for (const options of [{ cluster: "mainnet" }, { occupied: true }, { simulation: false }]) {
      const run = harness(options);
      expect(await run.execute()).toMatchObject({ ok: false, broadcast: false });
      expect(run.counters().sends).toBe(0);
    }
  });
  it("reports a send exception as an unknown outcome, never as proof nothing was sent", async () => {
    const run = harness({ sendFails: true });
    expect(await run.execute()).toEqual({ ok: false, reason: "send_outcome_unknown", broadcast: "unknown" });
    expect(run.counters()).toEqual({ simulations: 1, sends: 1, confirms: 0 });
  });
});
