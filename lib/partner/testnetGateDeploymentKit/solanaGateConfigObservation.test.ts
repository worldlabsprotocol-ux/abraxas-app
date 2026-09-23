import { describe, expect, it } from "vitest";
import { PublicKey } from "@solana/web3.js";
import { gateConfigDiscriminator } from "@/lib/partner/onchainGateDeployments/solanaObserve";
import { planSolanaDevnetGateConfig } from "./solanaConfigPreflight";
import { verifyObservedGateConfig } from "./solanaGateConfigObservation";

const signer = { document: "abraxas_chain_attestation_verification_keys", algorithm: "ed25519",
  environment: "sandbox", keys: [{ key_id: "solana-devnet-signer-1", algorithm: "ed25519",
    environment: "sandbox", status: "active", public_verifier: `0x${"11".repeat(32)}`,
    allowed_networks: ["solana_devnet"], allowed_gate_types: ["solana"], schema_versions: ["2"],
    not_before: "2026-01-01T00:00:00.000Z", expires_at: "2027-01-01T00:00:00.000Z" }] };
const checked = planSolanaDevnetGateConfig({ partnerId: "partner-sandbox-1", applicationId: "app-sandbox-1",
  adminPubkey: "28M4TxRGsh5fbo7BDfR7gtdAxbsPjmMJiX8LAU32doHt",
  signerKeyId: "solana-devnet-signer-1", signerDocument: signer,
  now: new Date("2026-09-23T00:00:00.000Z") });
if (!checked.ok) throw new Error("invalid_fixture");
const plan = checked.plan;

function account() {
  const [, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("gate_config"), new PublicKey(plan.admin_pubkey).toBuffer()], new PublicKey(plan.gate_program_id));
  const hex = (value: string) => Buffer.from(value.slice(2), "hex");
  const data = Buffer.concat([
    Buffer.from(gateConfigDiscriminator()),
    new PublicKey(plan.admin_pubkey).toBuffer(), new PublicKey(plan.partner_program_id).toBuffer(),
    hex(plan.network_hash), hex(plan.partner_hash), hex(plan.policy_hash), hex(plan.action_hash), hex(plan.environment_hash),
    Buffer.from([1, 1]), hex(plan.expected_organization_commitment), hex(plan.expected_actor_commitment),
    hex(plan.expected_institutional_result_category), Buffer.from([bump]),
    hex(plan.signer_key_hash), hex(plan.trusted_signer), Buffer.from([1]), Buffer.alloc(3 * 65),
  ]);
  return { owner: plan.gate_program_id, data };
}

describe("post-initialization Solana GateConfig observation", () => {
  it("accepts the exact institutional V2 bindings and active signer", () => {
    expect(verifyObservedGateConfig(plan, account())).toEqual({ ok: true,
      gate_config_pda: plan.gate_config_pda, config_digest: plan.config_digest,
      institutional_v2: true, signer_active: true });
  });
  it("fails closed on absent, wrong-owner, changed policy/action, standard gate, and stale signer", () => {
    expect(verifyObservedGateConfig(plan, null)).toEqual({ ok: false, reason: "config_missing" });
    const owner = account(); owner.owner = plan.partner_program_id;
    expect(verifyObservedGateConfig(plan, owner)).toEqual({ ok: false, reason: "config_mismatch" });
    for (const offset of [8 + 4 * 32, 8 + 5 * 32, 8 + 7 * 32 + 1]) {
      const changed = account(); changed.data[offset] ^= 1;
      expect(verifyObservedGateConfig(plan, changed)).toEqual({ ok: false, reason: "config_mismatch" });
    }
    const stale = account(); stale.data[stale.data.length - 3 * 65 - 1] = 3;
    expect(verifyObservedGateConfig(plan, stale)).toEqual({ ok: false, reason: "signer_mismatch" });
  });
});

