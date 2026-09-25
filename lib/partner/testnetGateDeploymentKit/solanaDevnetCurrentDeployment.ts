import { createHash } from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import { LOCAL_SOLANA_CONSUMER_PROGRAM_ID, LOCAL_SOLANA_GATE_PROGRAM_ID } from "@/lib/partner/chainAttestation/solanaGate";
import { REVIEWED_INSTITUTIONAL_DEVNET } from "@/lib/partner/chainAttestation/solanaDevnetProofPacket";
import { encodeGateConfigAccount } from "@/lib/partner/onchainGateDeployments/solanaObserve";
import { inspectProgram, REVIEWED_DEVNET_PROGRAMS, type PublicSolanaAccountSource } from "./solanaDevnetChainPrecheck";

const ADMIN = "28M4TxRGsh5fbo7BDfR7gtdAxbsPjmMJiX8LAU32doHt";

type CurrentDeploymentResult =
  | { ok: true; current_deployment: "matched" }
  | { ok: false; reason: string };

const equal = (actual: Uint8Array, expected: Uint8Array) =>
  Buffer.from(actual).equals(Buffer.from(expected));

/** Require current devnet code and both config accounts to match the reviewed institutional release. */
export async function inspectCurrentInstitutionalDevnetDeployment(
  readAccount: PublicSolanaAccountSource,
): Promise<CurrentDeploymentResult> {
  const fail = (reason: string): CurrentDeploymentResult => ({ ok: false, reason });
  const gate = await inspectProgram(REVIEWED_DEVNET_PROGRAMS.gate, readAccount);
  if (gate !== "matched") return fail(gate === "unavailable" ? "rpc_unavailable" : "gate_artifact_mismatch");
  const consumer = await inspectProgram(REVIEWED_DEVNET_PROGRAMS.consumer, readAccount);
  if (consumer !== "matched") return fail(consumer === "unavailable" ? "rpc_unavailable" : "consumer_artifact_mismatch");

  const reviewed = REVIEWED_INSTITUTIONAL_DEVNET;
  const gateProgram = new PublicKey(LOCAL_SOLANA_GATE_PROGRAM_ID);
  const consumerProgram = new PublicKey(LOCAL_SOLANA_CONSUMER_PROGRAM_ID);
  const [gatePda, gateBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("gate_config"), new PublicKey(ADMIN).toBuffer()], gateProgram,
  );
  if (gatePda.toBase58() !== reviewed.gateConfig) return fail("gate_config_mismatch");
  const gateConfig = await readAccount(reviewed.gateConfig);
  if (!gateConfig || "unavailable" in gateConfig) return fail(gateConfig ? "rpc_unavailable" : "gate_config_missing");
  const expectedGate = encodeGateConfigAccount({
    admin: ADMIN, partnerProgram: LOCAL_SOLANA_CONSUMER_PROGRAM_ID,
    networkId: reviewed.networkId, partnerHash: reviewed.partnerHash,
    policyHash: reviewed.policyHash, actionHash: reviewed.actionHash,
    environment: reviewed.environment, requireSubject: true, requireInstitutional: true,
    bump: gateBump, signerKeyId: reviewed.signerKeyId, signerPubkey: reviewed.signerPublicKey,
  });
  if (gateConfig.owner !== LOCAL_SOLANA_GATE_PROGRAM_ID || !equal(gateConfig.data, expectedGate)) {
    return fail("gate_config_mismatch");
  }

  const [protocolPda, protocolBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("protocol_access_config"), gatePda.toBuffer()], consumerProgram,
  );
  if (protocolPda.toBase58() !== reviewed.protocolConfig) return fail("protocol_config_mismatch");
  const protocolConfig = await readAccount(reviewed.protocolConfig);
  if (!protocolConfig || "unavailable" in protocolConfig) return fail(protocolConfig ? "rpc_unavailable" : "protocol_config_missing");
  const discriminator = createHash("sha256").update("account:ProtocolAccessConfig").digest().subarray(0, 8);
  const hashes = [reviewed.partnerHash, reviewed.policyHash, reviewed.actionHash, reviewed.environment]
    .map((hash) => Buffer.from(hash.slice(2), "hex"));
  const expectedProtocol = Buffer.concat([
    discriminator, gatePda.toBuffer(), ...hashes, Buffer.from([protocolBump]),
  ]);
  if (protocolConfig.owner !== LOCAL_SOLANA_CONSUMER_PROGRAM_ID || !equal(protocolConfig.data, expectedProtocol)) {
    return fail("protocol_config_mismatch");
  }
  return { ok: true, current_deployment: "matched" };
}
