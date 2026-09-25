import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { PublicKey } from "@solana/web3.js";
import { encodeSolanaEligibilityMessage, hexToBytes } from "@/lib/partner/chainAttestation/solanaMessage";
import { LOCAL_SOLANA_CONSUMER_PROGRAM_ID, LOCAL_SOLANA_GATE_PROGRAM_ID } from "@/lib/partner/chainAttestation/solanaGate";
import { REVIEWED_INSTITUTIONAL_DEVNET as reviewed } from "@/lib/partner/chainAttestation/solanaDevnetProofPacket";
import { inspectInstitutionalSolanaDevnetProof } from "./solanaDevnetProofObserve";

const h = (n: number) => `0x${n.toString(16).padStart(2, "0").repeat(32)}` as `0x${string}`;
const fields = {
  schemaVersion: 2 as const, networkId: reviewed.networkId, partnerHash: reviewed.partnerHash,
  policyHash: reviewed.policyHash, actionHash: reviewed.actionHash, environment: reviewed.environment,
  signerKeyId: reviewed.signerKeyId, subjectHash: h(1), issuedAt: 1000, expiresAt: 2000,
  nonce: h(2), attestationId: h(3), organizationCommitment: h(4), actorCommitment: h(5), institutionalResultCategory: h(6),
};
const discriminator = (name: string) => createHash("sha256").update(`account:${name}`).digest().subarray(0, 8);
const pubkey = (value: string) => new PublicKey(value).toBuffer();
const expiry = Buffer.alloc(8); expiry.writeBigInt64LE(2000n);
const authorization = Buffer.concat([
  discriminator("Authorization"), pubkey(reviewed.gateConfig), pubkey(LOCAL_SOLANA_CONSUMER_PROGRAM_ID),
  ...[fields.policyHash, fields.actionHash, fields.attestationId, fields.subjectHash, fields.organizationCommitment,
    fields.actorCommitment, fields.institutionalResultCategory].map((v) => Buffer.from(hexToBytes(v))),
  expiry, Buffer.from([1, 0, 255]),
]);
const entitlement = Buffer.concat([
  discriminator("ProtocolEntitlement"), pubkey(reviewed.protocolConfig), pubkey(reviewed.gateConfig),
  ...[fields.subjectHash, fields.organizationCommitment, fields.attestationId].map((v) => Buffer.from(hexToBytes(v))),
  expiry, Buffer.from([255]),
]);
const input = {
  authorization: { owner: LOCAL_SOLANA_GATE_PROGRAM_ID, data: authorization },
  entitlement: { owner: LOCAL_SOLANA_CONSUMER_PROGRAM_ID, data: entitlement },
  message: encodeSolanaEligibilityMessage(fields),
};

describe("finalized institutional Solana proof observation", () => {
  it("accepts only the consumed authorization and matching entitlement", () => {
    expect(inspectInstitutionalSolanaDevnetProof(input)).toEqual({ ok: true, consumed: true, valid_until: 2000 });
  });
  it("rejects unconsumed, wrong owner, and changed entitlement binding", () => {
    const unconsumed = Buffer.from(authorization); unconsumed[304] = 0;
    expect(inspectInstitutionalSolanaDevnetProof({ ...input, authorization: { ...input.authorization, data: unconsumed } })).toEqual({ ok: false, reason: "proof_state_mismatch" });
    expect(inspectInstitutionalSolanaDevnetProof({ ...input, authorization: { ...input.authorization, owner: LOCAL_SOLANA_CONSUMER_PROGRAM_ID } })).toEqual({ ok: false, reason: "authorization_missing_or_invalid" });
    const changed = Buffer.from(entitlement); changed[72] ^= 1;
    expect(inspectInstitutionalSolanaDevnetProof({ ...input, entitlement: { ...input.entitlement, data: changed } })).toEqual({ ok: false, reason: "proof_account_mismatch" });
  });
});

