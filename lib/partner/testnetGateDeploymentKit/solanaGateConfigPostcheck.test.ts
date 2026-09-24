import { describe, expect, it } from "vitest";
import { PublicKey } from "@solana/web3.js";
import { solanaProgramElfKeccak, solanaProgramElfSha256 } from "@/lib/partner/onchainGateDeployments/solanaElfDigest";
import { encodeGateConfigAccount, encodeProgramDataAccount, encodeUpgradeableProgramAccount } from "@/lib/partner/onchainGateDeployments/solanaObserve";
import { SOLANA_UPGRADEABLE_LOADER } from "@/lib/partner/onchainGateDeployments/solanaArtifacts";
import { REVIEWED_DEVNET_PROGRAMS, SOLANA_DEVNET_GENESIS_HASH } from "./solanaDevnetChainPrecheck";
import { planSolanaDevnetGateConfig } from "./solanaConfigPreflight";
import { inspectSolanaGateConfigAfterInitialize } from "./solanaGateConfigPostcheck";
import { buildVerifiedSolanaDevnetRegistryManifest } from "./solanaDevnetRegistryManifest";
import { parseOnchainDeploymentManifest } from "@/lib/partner/onchainGateDeployments/parseManifest";

const admin = "28M4TxRGsh5fbo7BDfR7gtdAxbsPjmMJiX8LAU32doHt";
const verifier = `0x${"11".repeat(32)}`;
const binding = {
  partnerId: "partner-sandbox-1",
  applicationId: "app-sandbox-1",
  adminPubkey: admin,
  signerKeyId: "solana-devnet-signer-1",
  now: new Date("2026-09-23T00:00:00.000Z"),
  signerDocument: {
    document: "abraxas_chain_attestation_verification_keys", algorithm: "ed25519", environment: "sandbox",
    keys: [{ key_id: "solana-devnet-signer-1", algorithm: "ed25519", environment: "sandbox",
      status: "active", public_verifier: verifier, allowed_networks: ["solana_devnet"],
      allowed_gate_types: ["solana"], schema_versions: ["2"],
      not_before: "2026-01-01T00:00:00.000Z", expires_at: "2027-01-01T00:00:00.000Z" }],
  },
};
const planned = planSolanaDevnetGateConfig(binding);
if (!planned.ok) throw new Error(planned.reason);
const plan = planned.plan;
const [pda, bump] = PublicKey.findProgramAddressSync(
  [Buffer.from("gate_config"), new PublicKey(admin).toBuffer()], new PublicKey(plan.gate_program_id),
);
const gateElf = new TextEncoder().encode("gate-postcheck-fixture");
const consumerElf = new TextEncoder().encode("consumer-postcheck-fixture");
const reviewed = {
  gate: { programId: REVIEWED_DEVNET_PROGRAMS.gate.programId, elfBytes: gateElf.length,
    keccak: solanaProgramElfKeccak(gateElf), sha256: solanaProgramElfSha256(gateElf) },
  consumer: { programId: REVIEWED_DEVNET_PROGRAMS.consumer.programId, elfBytes: consumerElf.length,
    keccak: solanaProgramElfKeccak(consumerElf), sha256: solanaProgramElfSha256(consumerElf) },
};
const gateData = "8uZep2zGjgezuooDeqTQfqKXBW3AvQx51WcqKx8dzjK5";
const consumerData = "BWdQjZ58KTjdYUHji7vYNXeTXhB8fi81oqfKyYoG8EGp";
function accountMap() {
  return new Map([
    [plan.gate_program_id, { owner: SOLANA_UPGRADEABLE_LOADER, data: encodeUpgradeableProgramAccount(gateData) }],
    [gateData, { owner: SOLANA_UPGRADEABLE_LOADER, data: encodeProgramDataAccount(gateElf, admin) }],
    [plan.partner_program_id, { owner: SOLANA_UPGRADEABLE_LOADER, data: encodeUpgradeableProgramAccount(consumerData) }],
    [consumerData, { owner: SOLANA_UPGRADEABLE_LOADER, data: encodeProgramDataAccount(consumerElf, admin) }],
    [pda.toBase58(), { owner: plan.gate_program_id, data: encodeGateConfigAccount({
      admin, partnerProgram: plan.partner_program_id, networkId: plan.network_hash,
      partnerHash: plan.partner_hash, policyHash: plan.policy_hash, actionHash: plan.action_hash,
      environment: plan.environment_hash, requireSubject: true, requireInstitutional: true,
      bump, signerKeyId: plan.signer_key_hash, signerPubkey: plan.trusted_signer,
    }) }],
  ]);
}
function check(accounts = accountMap(), genesis = async () => SOLANA_DEVNET_GENESIS_HASH) {
  return inspectSolanaGateConfigAfterInitialize({ ...binding, reviewed, genesis,
    readAccount: async (key) => accounts.get(key) ?? null });
}

describe("exact read-only Solana GateConfig postcheck", () => {
  it("exports only a parsed registry manifest after exact onchain observation", async () => {
    const readAccount = async (key: string) => accountMap().get(key) ?? null;
    const result = await buildVerifiedSolanaDevnetRegistryManifest({
      ...binding, reviewed, genesis: async () => SOLANA_DEVNET_GENESIS_HASH, readAccount,
    });
    expect(result).toMatchObject({ ok: true, observed: "exact_match", registered: false, broadcast: false });
    if (!result.ok) throw new Error(result.reason);
    expect(parseOnchainDeploymentManifest(result.manifest).ok).toBe(true);
    expect(result.manifest).toMatchObject({
      network_id: "solana_devnet", gate_type: "solana", gate_config_pda: pda.toBase58(),
      partner_hash: plan.partner_hash, policy_hash: plan.policy_hash, action_hash: plan.action_hash,
      signer_key_id: binding.signerKeyId, environment: "sandbox", subject_binding_mode: "required",
    });
    const missing = accountMap(); missing.delete(pda.toBase58());
    expect(await buildVerifiedSolanaDevnetRegistryManifest({ ...binding, reviewed,
      genesis: async () => SOLANA_DEVNET_GENESIS_HASH,
      readAccount: async (key) => missing.get(key) ?? null,
    })).toEqual({ ok: false, reason: "gate_config_missing", registered: false, broadcast: false });
  });
  it("matches the full account including signer public key and zero reusable commitments", async () => {
    expect(await check()).toMatchObject({ ok: true, gate_config: "exact_match",
      gate_config_pda: pda.toBase58(), registry_status: "not_registered", broadcast: false });
  });
  it("rejects missing config, wrong cluster, changed signer, policy, commitments, and code", async () => {
    const missing = accountMap(); missing.delete(pda.toBase58());
    expect(await check(missing)).toEqual({ ok: false, reason: "gate_config_missing", broadcast: false });
    expect(await check(accountMap(), async () => "mainnet")).toEqual({ ok: false, reason: "wrong_cluster", broadcast: false });
    for (const byteOffset of [8 + 32 + 32 + 32 + 32, 8 + 32 * 7 + 2, 8 + 32 * 7 + 2 + 96 + 1 + 32]) {
      const changed = accountMap(); const row = changed.get(pda.toBase58())!;
      const data = Buffer.from(row.data); data[byteOffset] ^= 1;
      changed.set(pda.toBase58(), { ...row, data });
      expect(await check(changed)).toEqual({ ok: false, reason: "gate_config_mismatch", broadcast: false });
    }
    const changed = accountMap(); changed.set(gateData, { owner: SOLANA_UPGRADEABLE_LOADER,
      data: encodeProgramDataAccount(consumerElf, admin) });
    expect(await check(changed)).toEqual({ ok: false, reason: "gate_artifact_mismatch", broadcast: false });
  });
});
