import { describe, expect, it } from "vitest";
import { planSolanaDevnetGateConfig } from "./solanaConfigPreflight";

const signer = {
  document: "abraxas_chain_attestation_verification_keys",
  algorithm: "ed25519",
  environment: "sandbox",
  keys: [{
    key_id: "solana-devnet-signer-1",
    algorithm: "ed25519",
    environment: "sandbox",
    status: "active",
    public_verifier: `0x${"11".repeat(32)}`,
    allowed_networks: ["solana_devnet"],
    allowed_gate_types: ["solana"],
    schema_versions: ["2"],
    not_before: "2026-01-01T00:00:00.000Z",
    expires_at: "2027-01-01T00:00:00.000Z",
  }],
};
const input = {
  partnerId: "partner-sandbox-1",
  applicationId: "app-sandbox-1",
  adminPubkey: "28M4TxRGsh5fbo7BDfR7gtdAxbsPjmMJiX8LAU32doHt",
  signerKeyId: "solana-devnet-signer-1",
  signerDocument: signer,
  now: new Date("2026-09-23T00:00:00.000Z"),
};

describe("Solana devnet GateConfig read-only preflight", () => {
  it("pins reviewed programs, policy and reusable V2 bindings without raw tenant IDs", () => {
    const result = planSolanaDevnetGateConfig(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.gate_program_id).toBe("4hf3cY57ciPakr4omyTSbksAfW672iGrdo6fiDVQAD4K");
    expect(result.plan.partner_program_id).toBe("3B9eE1WtrtZQwJrkhFSKxxaZrefRJ73P53xHBBP3Bv1j");
    expect(result.plan.policy_id).toBe("sandbox_institutional_protocol_access");
    expect(result.plan.policy_version).toBe(1);
    expect(result.plan.require_institutional).toBe(true);
    expect(result.plan.require_subject).toBe(true);
    expect(result.plan.expected_organization_commitment).toBe(`0x${"00".repeat(32)}`);
    expect(result.plan.config_digest).toMatch(/^0x[0-9a-f]{64}$/);
    expect(result.plan.broadcast).toBe(false);
    expect(result.plan.ownership_verified).toBe(false);
    expect(JSON.stringify(result.plan)).not.toContain(input.partnerId);
    expect(JSON.stringify(result.plan)).not.toContain(input.applicationId);
  });

  it("rejects placeholders, missing admin and malformed public verifier", () => {
    expect(planSolanaDevnetGateConfig({ ...input, partnerId: "YOUR_PARTNER_ID" }))
      .toEqual({ ok: false, reason: "placeholder_binding" });
    expect(planSolanaDevnetGateConfig({ ...input, applicationId: "" }))
      .toEqual({ ok: false, reason: "missing_binding" });
    expect(planSolanaDevnetGateConfig({ ...input, adminPubkey: "bad" }))
      .toEqual({ ok: false, reason: "invalid_admin" });
    const malformed = { ...signer, keys: [{ ...signer.keys[0], public_verifier: "not-a-key" }] };
    expect(planSolanaDevnetGateConfig({ ...input, signerDocument: malformed }))
      .toEqual({ ok: false, reason: "signer_ineligible" });
  });

  it("requires one active, in-window V2 devnet Ed25519 signer and rejects private material", () => {
    for (const change of [
      { status: "retiring" },
      { allowed_networks: ["solana_mainnet"] },
      { allowed_gate_types: ["evm"] },
      { schema_versions: ["1"] },
      { expires_at: "2026-01-01T00:00:00.000Z" },
    ]) {
      const document = { ...signer, keys: [{ ...signer.keys[0], ...change }] };
      expect(planSolanaDevnetGateConfig({ ...input, signerDocument: document }))
        .toEqual({ ok: false, reason: "signer_ineligible" });
    }
    expect(planSolanaDevnetGateConfig({ ...input, signerDocument: { ...signer, keys: [...signer.keys, ...signer.keys] } }))
      .toEqual({ ok: false, reason: "signer_unavailable" });
    expect(planSolanaDevnetGateConfig({ ...input, signerDocument: { ...signer, private_key: "forbidden" } }))
      .toEqual({ ok: false, reason: "invalid_signer_document" });
  });
});
