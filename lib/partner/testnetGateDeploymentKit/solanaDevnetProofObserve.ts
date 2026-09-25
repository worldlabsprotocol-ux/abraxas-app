import { createHash } from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import { decodeSolanaEligibilityMessage, hexToBytes } from "@/lib/partner/chainAttestation/solanaMessage";
import { LOCAL_SOLANA_CONSUMER_PROGRAM_ID, LOCAL_SOLANA_GATE_PROGRAM_ID } from "@/lib/partner/chainAttestation/solanaGate";
import { REVIEWED_INSTITUTIONAL_DEVNET } from "@/lib/partner/chainAttestation/solanaDevnetProofPacket";

type Observed = { owner: string; data: Uint8Array } | null;
const discriminator = (name: string) => createHash("sha256").update(`account:${name}`).digest().subarray(0, 8);
const equal = (a: Uint8Array, b: Uint8Array) => Buffer.from(a).equals(Buffer.from(b));

/** Compare the finalized authorization and entitlement bytes with the signed message. */
export function inspectInstitutionalSolanaDevnetProof(input: {
  authorization: Observed; entitlement: Observed; message: Uint8Array;
}): { ok: true; consumed: true; valid_until: number } | { ok: false; reason: string } {
  const fields = decodeSolanaEligibilityMessage(input.message);
  const auth = input.authorization;
  const ent = input.entitlement;
  if (!auth || auth.owner !== LOCAL_SOLANA_GATE_PROGRAM_ID || auth.data.length !== 307) return { ok: false, reason: "authorization_missing_or_invalid" };
  if (!ent || ent.owner !== LOCAL_SOLANA_CONSUMER_PROGRAM_ID || ent.data.length !== 177) return { ok: false, reason: "entitlement_missing_or_invalid" };
  const a = auth.data, e = ent.data;
  const protocol = new PublicKey(REVIEWED_INSTITUTIONAL_DEVNET.protocolConfig).toBytes();
  const config = new PublicKey(REVIEWED_INSTITUTIONAL_DEVNET.gateConfig).toBytes();
  const partner = new PublicKey(LOCAL_SOLANA_CONSUMER_PROGRAM_ID).toBytes();
  const checks: Array<[Uint8Array, Uint8Array]> = [
    [a.subarray(0, 8), discriminator("Authorization")], [a.subarray(8, 40), config],
    [a.subarray(40, 72), partner], [a.subarray(72, 104), hexToBytes(fields.policyHash)],
    [a.subarray(104, 136), hexToBytes(fields.actionHash)], [a.subarray(136, 168), hexToBytes(fields.attestationId)],
    [a.subarray(168, 200), hexToBytes(fields.subjectHash)], [a.subarray(200, 232), hexToBytes(fields.organizationCommitment)],
    [a.subarray(232, 264), hexToBytes(fields.actorCommitment)], [a.subarray(264, 296), hexToBytes(fields.institutionalResultCategory)],
    [e.subarray(0, 8), discriminator("ProtocolEntitlement")], [e.subarray(8, 40), protocol],
    [e.subarray(40, 72), config], [e.subarray(72, 104), hexToBytes(fields.subjectHash)],
    [e.subarray(104, 136), hexToBytes(fields.organizationCommitment)], [e.subarray(136, 168), hexToBytes(fields.attestationId)],
  ];
  if (checks.some(([actual, expected]) => !equal(actual, expected))) return { ok: false, reason: "proof_account_mismatch" };
  const authExpiry = new DataView(a.buffer, a.byteOffset + 296, 8).getBigInt64(0, true);
  const entitlementExpiry = new DataView(e.buffer, e.byteOffset + 168, 8).getBigInt64(0, true);
  if (authExpiry !== BigInt(fields.expiresAt) || entitlementExpiry !== authExpiry || a[304] !== 1 || a[305] !== 0) {
    return { ok: false, reason: "proof_state_mismatch" };
  }
  return { ok: true, consumed: true, valid_until: fields.expiresAt };
}

