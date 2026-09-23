import { createHash } from "node:crypto";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { hashSignerKeyId } from "@/lib/partner/chainAttestation/hashes";
import { prepareSolanaGateConfigInitialize } from "./solanaConfigInitialize";

const keyId = "solana-devnet-signer-1";
const partnerId = "partner-sandbox-1";
const applicationId = "app-sandbox-1";
const verifier = `0x${"11".repeat(32)}`;
const signerDocument = {
  document: "abraxas_chain_attestation_verification_keys",
  algorithm: "ed25519",
  environment: "sandbox",
  keys: [{
    key_id: keyId,
    algorithm: "ed25519",
    environment: "sandbox",
    status: "active",
    public_verifier: verifier,
    allowed_networks: ["solana_devnet"],
    allowed_gate_types: ["solana"],
    schema_versions: ["2"],
    not_before: "2026-01-01T00:00:00.000Z",
    expires_at: "2027-01-01T00:00:00.000Z",
  }],
};
const input = {
  partnerId,
  applicationId,
  adminPubkey: "28M4TxRGsh5fbo7BDfR7gtdAxbsPjmMJiX8LAU32doHt",
  signerKeyId: keyId,
  signerDocument,
  now: new Date("2026-09-23T00:00:00.000Z"),
};

describe("offline Solana GateConfig initialization packet", () => {
  it("encodes the Anchor V2 institutional instruction and exact account metas", () => {
    const result = prepareSolanaGateConfigInitialize(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const packet = result.packet;
    const data = Buffer.from(packet.instruction_data_base64, "base64");
    expect(data.length).toBe(362);
    expect(data.subarray(0, 8)).toEqual(createHash("sha256").update("global:initialize_config").digest().subarray(0, 8));
    expect(new PublicKey(data.subarray(8, 40)).toBase58()).toBe(packet.partner_program_id);
    expect(data.subarray(40, 72).toString("hex")).toBe(verifier.slice(2));
    expect(data.subarray(232, 264).toString("hex")).toBe(hashSignerKeyId(keyId).slice(2));
    expect([...data.subarray(264, 266)]).toEqual([1, 1]);
    expect(data.subarray(266).every((byte) => byte === 0)).toBe(true);
    expect(packet.accounts).toEqual([
      { pubkey: input.adminPubkey, is_signer: true, is_writable: true },
      { pubkey: packet.gate_config_pda, is_signer: false, is_writable: true },
      { pubkey: SystemProgram.programId.toBase58(), is_signer: false, is_writable: false },
    ]);
    expect(packet.program_id).toBe("4hf3cY57ciPakr4omyTSbksAfW672iGrdo6fiDVQAD4K");
    expect(packet.partner_program_id).toBe("3B9eE1WtrtZQwJrkhFSKxxaZrefRJ73P53xHBBP3Bv1j");
    expect(packet.broadcast).toBe(false);
    expect(packet.ownership_verified).toBe(false);
    expect(packet.onchain_config_observed).toBe(false);
    expect(JSON.stringify(result)).not.toContain(partnerId);
    expect(JSON.stringify(result)).not.toContain(applicationId);
  });

  it("fails closed before creating instruction bytes for unavailable or unqualified signers", () => {
    expect(prepareSolanaGateConfigInitialize({ ...input, signerDocument: { ok: false, status: "unavailable" } }))
      .toEqual({ ok: false, reason: "invalid_signer_document", broadcast: false });
    expect(prepareSolanaGateConfigInitialize({ ...input, signerDocument: {
      ...signerDocument,
      keys: [{ ...signerDocument.keys[0], status: "retiring" }],
    } })).toEqual({ ok: false, reason: "signer_ineligible", broadcast: false });
    expect(prepareSolanaGateConfigInitialize({ ...input, partnerId: "YOUR_PARTNER_ID" }))
      .toEqual({ ok: false, reason: "placeholder_binding", broadcast: false });
  });
});

