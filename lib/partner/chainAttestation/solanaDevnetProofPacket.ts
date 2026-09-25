// Secret-free preparation of the reviewed institutional devnet transaction.
// The caller must independently recheck live config/artifact state before signing.
import { createHash } from "node:crypto";
import { PublicKey, SystemProgram, SYSVAR_INSTRUCTIONS_PUBKEY, TransactionInstruction } from "@solana/web3.js";
import nacl from "tweetnacl";
import type { ChainEligibilityAttestationFields } from "./contract";
import { decodeSolanaEligibilityMessage, encodeSolanaEligibilityMessage, hexToBytes } from "./solanaMessage";
import { buildEd25519VerifyInstruction, deriveAuthorizationPda, deriveConsumerAuthorityPda, LOCAL_SOLANA_CONSUMER_PROGRAM_ID, LOCAL_SOLANA_GATE_PROGRAM_ID } from "./solanaGate";

export const REVIEWED_INSTITUTIONAL_DEVNET = {
  gateConfig: "53wiHMzFX9GttuVFQyQTvJGw9XvQmBbTcsGbwXQyk3D6",
  protocolConfig: "BPYeZySvW4k5GKoUnuXi5cPYhq8J3AcZB9tA8mLsbyYL",
  networkId: "0xd797fdae60e4b85eacabd735b9558a12bd06ccd644c4de9e0c83ee65b18ff92d",
  partnerHash: "0xf34d68b2c87306ce1c357592c850d0bfc21eecf81bbe6ddf6ab57f8427219309",
  policyHash: "0x54a56bf297411881409ec2fa5976aabf0e071ce8dcdd02aef3c252a08e437277",
  actionHash: "0x53a37ab3091d58031fae35e3b0671df0026cfb4006e9aee4234fadad0a384027",
  environment: "0x01a2938b29f43a6bd3fadc4dd7f2f2ab0f94ca775ad78a1230d96aca47f1088f",
  signerKeyId: "0x5ed86050c272d04f5a2391ab53fa1474f1ce38c622189996db4fd9e417cc4230",
  signerPublicKey: "0xf29db6673bd7000efcb7f8c2a99b4ea82a49653b60f6fc666ca7cc1ee585e4ef",
} as const;
type ReviewedBindings = { [K in keyof typeof REVIEWED_INSTITUTIONAL_DEVNET]: string };

export interface InstitutionalSolanaAttestation {
  fields?: ChainEligibilityAttestationFields;
  solana_message: string;
  solana_signature: string;
}

function exactHex(value: string, length: number): Uint8Array {
  if (!new RegExp(`^0x[0-9a-fA-F]{${length * 2}}$`).test(value)) throw new Error("invalid_hex");
  return hexToBytes(value);
}

function discriminator(name: string): Buffer {
  return createHash("sha256").update(`global:${name}`).digest().subarray(0, 8);
}

export function prepareInstitutionalSolanaDevnetProofPacket(input: {
  attestation: InstitutionalSolanaAttestation;
  signerPublicKey: string;
  payer: string;
  now?: number;
}): { authorization: string; entitlement: string; instructions: TransactionInstruction[] } {
  return prepareSolanaProofPacketForBindings(input, REVIEWED_INSTITUTIONAL_DEVNET);
}

/** Caller-supplied bindings are for isolated tests or independently reviewed deployments. */
export function prepareSolanaProofPacketForBindings(input: {
  attestation: InstitutionalSolanaAttestation;
  signerPublicKey: string;
  payer: string;
  now?: number;
}, expected: ReviewedBindings): { authorization: string; entitlement: string; instructions: TransactionInstruction[] } {
  const message = exactHex(input.attestation.solana_message, 468);
  const fields = decodeSolanaEligibilityMessage(message);
  if (input.attestation.fields && !Buffer.from(encodeSolanaEligibilityMessage(input.attestation.fields)).equals(Buffer.from(message))) throw new Error("message_mismatch");
  for (const [key, value] of Object.entries({
    networkId: expected.networkId, partnerHash: expected.partnerHash, policyHash: expected.policyHash,
    actionHash: expected.actionHash, environment: expected.environment, signerKeyId: expected.signerKeyId,
  })) {
    if (fields[key as keyof ChainEligibilityAttestationFields] !== value) throw new Error(`${key}_mismatch`);
  }
  if (fields.schemaVersion !== 2) throw new Error("schema_mismatch");
  const now = input.now ?? Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(now) || !Number.isSafeInteger(fields.issuedAt) || !Number.isSafeInteger(fields.expiresAt)
    || fields.issuedAt > now || fields.expiresAt <= now || fields.expiresAt <= fields.issuedAt) throw new Error("expired_or_invalid_time");
  const zero = `0x${"00".repeat(32)}`;
  for (const key of ["subjectHash", "organizationCommitment", "actorCommitment", "institutionalResultCategory"] as const) {
    if (fields[key] === zero) throw new Error(`${key}_required`);
    exactHex(fields[key], 32);
  }
  const attestationId = exactHex(fields.attestationId, 32);
  const subjectHash = exactHex(fields.subjectHash, 32);
  const organization = exactHex(fields.organizationCommitment, 32);
  const canonical = encodeSolanaEligibilityMessage(fields);
  if (!Buffer.from(message).equals(Buffer.from(canonical))) throw new Error("message_mismatch");
  const signature = exactHex(input.attestation.solana_signature, 64);
  if (input.signerPublicKey.toLowerCase() !== expected.signerPublicKey) throw new Error("untrusted_signer");
  const signer = exactHex(input.signerPublicKey, 32);
  if (!nacl.sign.detached.verify(message, signature, signer)) throw new Error("invalid_signature");

  const payer = new PublicKey(input.payer);
  const config = new PublicKey(expected.gateConfig);
  const protocol = new PublicKey(expected.protocolConfig);
  const gateProgram = new PublicKey(LOCAL_SOLANA_GATE_PROGRAM_ID);
  const partnerProgram = new PublicKey(LOCAL_SOLANA_CONSUMER_PROGRAM_ID);
  const [authorization] = deriveAuthorizationPda(config, attestationId, gateProgram);
  const [consumerAuthority] = deriveConsumerAuthorityPda(partnerProgram);
  const [entitlement] = PublicKey.findProgramAddressSync(
    [Buffer.from("protocol_access"), protocol.toBuffer(), Buffer.from(subjectHash), Buffer.from(organization)], partnerProgram,
  );
  const verify = buildEd25519VerifyInstruction({ publicKey: signer, signature, message });
  const authorize = new TransactionInstruction({
    programId: gateProgram,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: config, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: authorization, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([discriminator("authorize"), Buffer.from(attestationId)]),
  });
  const activate = new TransactionInstruction({
    programId: partnerProgram,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: gateProgram, isSigner: false, isWritable: false },
      { pubkey: config, isSigner: false, isWritable: false },
      { pubkey: authorization, isSigner: false, isWritable: true },
      { pubkey: partnerProgram, isSigner: false, isWritable: false },
      { pubkey: consumerAuthority, isSigner: false, isWritable: false },
      { pubkey: protocol, isSigner: false, isWritable: false },
      { pubkey: entitlement, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([discriminator("activate_protocol_access"), Buffer.from(subjectHash), Buffer.from(organization)]),
  });
  return { authorization: authorization.toBase58(), entitlement: entitlement.toBase58(), instructions: [verify, authorize, activate] };
}

