import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { PublicKey } from "@solana/web3.js";
import { LOCAL_SOLANA_CONSUMER_PROGRAM_ID, LOCAL_SOLANA_GATE_PROGRAM_ID } from "@/lib/partner/chainAttestation/solanaGate";
import { REVIEWED_INSTITUTIONAL_DEVNET } from "@/lib/partner/chainAttestation/solanaDevnetProofPacket";
import { encodeGateConfigAccount } from "@/lib/partner/onchainGateDeployments/solanaObserve";
import { inspectCurrentInstitutionalDevnetDeployment } from "./solanaDevnetCurrentDeployment";

vi.mock("./solanaDevnetChainPrecheck", async (importOriginal) => {
  const original = await importOriginal<typeof import("./solanaDevnetChainPrecheck")>();
  return { ...original, inspectProgram: vi.fn(async () => "matched") };
});

const admin = "28M4TxRGsh5fbo7BDfR7gtdAxbsPjmMJiX8LAU32doHt";
const reviewed = REVIEWED_INSTITUTIONAL_DEVNET;

function accounts() {
  const gateProgram = new PublicKey(LOCAL_SOLANA_GATE_PROGRAM_ID);
  const consumerProgram = new PublicKey(LOCAL_SOLANA_CONSUMER_PROGRAM_ID);
  const [gate, gateBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("gate_config"), new PublicKey(admin).toBuffer()], gateProgram,
  );
  const [protocol, protocolBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("protocol_access_config"), gate.toBuffer()], consumerProgram,
  );
  const gateData = encodeGateConfigAccount({
    admin, partnerProgram: LOCAL_SOLANA_CONSUMER_PROGRAM_ID, networkId: reviewed.networkId,
    partnerHash: reviewed.partnerHash, policyHash: reviewed.policyHash, actionHash: reviewed.actionHash,
    environment: reviewed.environment, requireSubject: true, requireInstitutional: true,
    bump: gateBump, signerKeyId: reviewed.signerKeyId, signerPubkey: reviewed.signerPublicKey,
  });
  const protocolData = Buffer.concat([
    createHash("sha256").update("account:ProtocolAccessConfig").digest().subarray(0, 8),
    gate.toBuffer(),
    ...[reviewed.partnerHash, reviewed.policyHash, reviewed.actionHash, reviewed.environment]
      .map((hash) => Buffer.from(hash.slice(2), "hex")),
    Buffer.from([protocolBump]),
  ]);
  return new Map([
    [gate.toBase58(), { owner: LOCAL_SOLANA_GATE_PROGRAM_ID, data: gateData }],
    [protocol.toBase58(), { owner: LOCAL_SOLANA_CONSUMER_PROGRAM_ID, data: protocolData }],
  ]);
}

describe("current institutional Solana devnet deployment", () => {
  it("accepts exact gate and protocol configuration after program checks", async () => {
    const rows = accounts();
    expect(await inspectCurrentInstitutionalDevnetDeployment(async (key) => rows.get(key) ?? null))
      .toEqual({ ok: true, current_deployment: "matched" });
  });

  it("rejects changed gate and protocol bytes", async () => {
    const gateRows = accounts();
    const gate = gateRows.get(reviewed.gateConfig)!;
    const gateBytes = Buffer.from(gate.data);
    gateBytes[72] ^= 1;
    gateRows.set(reviewed.gateConfig, { ...gate, data: gateBytes });
    expect(await inspectCurrentInstitutionalDevnetDeployment(async (key) => gateRows.get(key) ?? null))
      .toEqual({ ok: false, reason: "gate_config_mismatch" });

    const protocolRows = accounts();
    const protocol = protocolRows.get(reviewed.protocolConfig)!;
    const protocolBytes = Buffer.from(protocol.data);
    protocolBytes[72] ^= 1;
    protocolRows.set(reviewed.protocolConfig, { ...protocol, data: protocolBytes });
    expect(await inspectCurrentInstitutionalDevnetDeployment(async (key) => protocolRows.get(key) ?? null))
      .toEqual({ ok: false, reason: "protocol_config_mismatch" });
  });
});
