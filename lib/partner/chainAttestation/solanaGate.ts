// Local/reference Solana eligibility-gate helpers. No RPC, no funds movement.

import { PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";
import {
  buildSolanaEd25519VerifyInstructionData,
  SOLANA_ED25519_PROGRAM_ID,
} from "./solanaMessage";

/** Local ProgramTest IDs only. Not deployed to devnet or Mainnet. */
export const LOCAL_SOLANA_GATE_PROGRAM_ID = "GmaDrppBC7P5ARKV8g3djiwP89vz1jLK23V2GBjuAEGB";
export const LOCAL_SOLANA_CONSUMER_PROGRAM_ID = "J2xccRtuG43drESLYznHhLhQkLTdfepcKYbiQ9BsJVaf";

export const SOLANA_GATE_CONFIG_SEED = "gate_config";
export const SOLANA_GATE_AUTHORIZATION_SEED = "authorization";
export const SOLANA_GATE_CONSUMER_AUTHORITY_SEED = "consumer_authority";
export const SOLANA_GATE_DEPLOYMENT_NOTICE =
  "These program IDs are local/reference fixtures. Abraxas has not deployed this program to devnet or Mainnet.";

export const SOLANA_GATE_ERROR_MAP = {
  6000: "attestation_unavailable",
  6001: "missing_ed25519",
  6002: "wrong_prior_instruction",
  6003: "unknown_signer",
  6004: "invalid_message",
  6005: "network_mismatch",
  6006: "partner_mismatch",
  6007: "policy_mismatch",
  6008: "action_mismatch",
  6009: "environment_mismatch",
  6010: "signer_key_mismatch",
  6011: "subject_required",
  6012: "expired",
  6013: "replayed",
  6014: "wrong_partner_program",
} as const;

export type SolanaGateSafeReason = (typeof SOLANA_GATE_ERROR_MAP)[keyof typeof SOLANA_GATE_ERROR_MAP] | "invalid";

export function mapSolanaGateError(code: number): SolanaGateSafeReason {
  return SOLANA_GATE_ERROR_MAP[code as keyof typeof SOLANA_GATE_ERROR_MAP] ?? "invalid";
}

export function deriveGateConfigPda(admin: PublicKey, programId = new PublicKey(LOCAL_SOLANA_GATE_PROGRAM_ID)): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SOLANA_GATE_CONFIG_SEED), admin.toBuffer()],
    programId,
  );
}

export function deriveAuthorizationPda(
  config: PublicKey,
  attestationId: Uint8Array,
  programId = new PublicKey(LOCAL_SOLANA_GATE_PROGRAM_ID),
): [PublicKey, number] {
  if (attestationId.length !== 32) throw new Error("invalid_attestation_id");
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SOLANA_GATE_AUTHORIZATION_SEED), config.toBuffer(), Buffer.from(attestationId)],
    programId,
  );
}

export function deriveConsumerAuthorityPda(
  partnerProgramId = new PublicKey(LOCAL_SOLANA_CONSUMER_PROGRAM_ID),
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SOLANA_GATE_CONSUMER_AUTHORITY_SEED)],
    partnerProgramId,
  );
}

export function buildAuthorizeAccountKeys(input: {
  payer: PublicKey;
  config: PublicKey;
  authorization: PublicKey;
}): Array<{ pubkey: PublicKey; isSigner: boolean; isWritable: boolean }> {
  return [
    { pubkey: input.payer, isSigner: true, isWritable: true },
    { pubkey: input.config, isSigner: false, isWritable: false },
    { pubkey: new PublicKey("Sysvar1nstructions1111111111111111111111111"), isSigner: false, isWritable: false },
    { pubkey: input.authorization, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];
}

export function buildEd25519VerifyInstruction(input: {
  publicKey: Uint8Array;
  signature: Uint8Array;
  message: Uint8Array;
}): TransactionInstruction {
  const layout = buildSolanaEd25519VerifyInstructionData(input);
  return new TransactionInstruction({
    programId: new PublicKey(SOLANA_ED25519_PROGRAM_ID),
    keys: [],
    data: Buffer.from(layout.instructionData),
  });
}

export const SOLANA_ONCHAIN_GATE_FLOW = `
Private holder verification -> server verifies the current public receipt ->
Abraxas signs a narrow Solana authorization (canonical message + dedicated Ed25519 key) ->
the partner transaction includes the Ed25519 native verify instruction immediately before gate authorize ->
the partner program CPI-consumes the PDA once. Server durable nonce (migration 101) and the onchain PDA are both required.
`.trim();
