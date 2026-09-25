import { describe, expect, it } from "vitest";
import { Keypair } from "@solana/web3.js";
import nacl from "tweetnacl";
import { bytesToHex, encodeSolanaEligibilityMessage } from "./solanaMessage";
import { LOCAL_SOLANA_CONSUMER_PROGRAM_ID, LOCAL_SOLANA_GATE_PROGRAM_ID } from "./solanaGate";
import { prepareInstitutionalSolanaDevnetProofPacket, prepareSolanaProofPacketForBindings, REVIEWED_INSTITUTIONAL_DEVNET } from "./solanaDevnetProofPacket";

const hex32 = (n: number) => `0x${n.toString(16).padStart(2, "0").repeat(32)}` as `0x${string}`;
const pair = nacl.sign.keyPair.fromSeed(new Uint8Array(32).fill(7));
const payer = Keypair.generate().publicKey.toBase58();
const fields = {
  schemaVersion: 2 as const,
  ...REVIEWED_INSTITUTIONAL_DEVNET,
  subjectHash: hex32(1), issuedAt: 1000, expiresAt: 2000,
  nonce: hex32(2), attestationId: hex32(3),
  organizationCommitment: hex32(4), actorCommitment: hex32(5), institutionalResultCategory: hex32(6),
};
const message = encodeSolanaEligibilityMessage(fields);
const attestation = {
  fields,
  solana_message: bytesToHex(message),
  solana_signature: bytesToHex(nacl.sign.detached(message, pair.secretKey)),
};
const input = { attestation, signerPublicKey: bytesToHex(pair.publicKey), payer, now: 1500 };
const testBindings = { ...REVIEWED_INSTITUTIONAL_DEVNET, signerPublicKey: bytesToHex(pair.publicKey) };

describe("institutional Solana devnet proof packet", () => {
  it("orders verify immediately before authorize, then activates through the consumer", () => {
    const packet = prepareSolanaProofPacketForBindings(input, testBindings);
    expect(packet.instructions.map((ix) => ix.programId.toBase58())).toEqual([
      "Ed25519SigVerify111111111111111111111111111",
      LOCAL_SOLANA_GATE_PROGRAM_ID,
      LOCAL_SOLANA_CONSUMER_PROGRAM_ID,
    ]);
    expect(packet.instructions[1]?.keys[3]?.pubkey.toBase58()).toBe(packet.authorization);
    expect(packet.instructions[2]?.keys[3]?.pubkey.toBase58()).toBe(packet.authorization);
    expect(packet.instructions[2]?.keys[7]?.pubkey.toBase58()).toBe(packet.entitlement);
    expect(packet.instructions[1]?.data.length).toBe(40);
    expect(packet.instructions[2]?.data.length).toBe(72);
  });

  it("rejects altered binding, signature, stale message, and expired attestation", () => {
    const alteredFields = { ...fields, partnerHash: hex32(8) };
    const alteredMessage = encodeSolanaEligibilityMessage(alteredFields);
    expect(() => prepareInstitutionalSolanaDevnetProofPacket(input)).toThrow("untrusted_signer");
    expect(() => prepareSolanaProofPacketForBindings({ ...input, attestation: { fields: alteredFields, solana_message: bytesToHex(alteredMessage), solana_signature: bytesToHex(nacl.sign.detached(alteredMessage, pair.secretKey)) } }, testBindings)).toThrow("partnerHash_mismatch");
    expect(() => prepareSolanaProofPacketForBindings({ ...input, signerPublicKey: hex32(8) }, { ...testBindings, signerPublicKey: hex32(8) })).toThrow("invalid_signature");
    expect(() => prepareSolanaProofPacketForBindings({ ...input, attestation: { ...attestation, solana_message: bytesToHex(new Uint8Array(468)) } }, testBindings)).toThrow("invalid_message_prefix");
    expect(() => prepareSolanaProofPacketForBindings({ ...input, now: 2000 }, testBindings)).toThrow("expired_or_invalid_time");
  });
});

