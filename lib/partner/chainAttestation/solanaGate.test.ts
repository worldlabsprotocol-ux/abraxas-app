// FILE: lib/partner/chainAttestation/solanaGate.test.ts
// SDK serialization, PDA, and instruction helpers. No RPC.

import { describe, expect, it } from "vitest";
import { Keypair, PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";
import { encodeSolanaEligibilityMessage, buildSolanaEd25519VerifyInstructionData } from "./solanaMessage";
import {
  buildAuthorizeAccountKeys,
  buildEd25519VerifyInstruction,
  deriveAuthorizationPda,
  deriveConsumerAuthorityPda,
  deriveGateConfigPda,
  LOCAL_SOLANA_CONSUMER_PROGRAM_ID,
  LOCAL_SOLANA_GATE_PROGRAM_ID,
  mapSolanaGateError,
  SOLANA_GATE_DEPLOYMENT_NOTICE,
  SOLANA_ONCHAIN_GATE_FLOW,
} from "./solanaGate";
import { SOLANA_ATTESTATION_MESSAGE_PREFIX } from "./contract";

describe("solana onchain eligibility gate SDK", () => {
  it("derives PDAs and maps errors without claiming a live deployment", () => {
    const admin = Keypair.generate().publicKey;
    const [config] = deriveGateConfigPda(admin);
    const attestationId = new Uint8Array(32).fill(7);
    const [auth] = deriveAuthorizationPda(config, attestationId);
    const [consumer] = deriveConsumerAuthorityPda();
    expect(config.toBase58()).not.toBe(admin.toBase58());
    expect(auth.toBase58()).not.toBe(config.toBase58());
    expect(consumer.toBase58().length).toBeGreaterThan(30);
    expect(mapSolanaGateError(6003)).toBe("unknown_signer");
    expect(mapSolanaGateError(6014)).toBe("replayed");
    expect(mapSolanaGateError(9)).toBe("invalid");
    expect(LOCAL_SOLANA_GATE_PROGRAM_ID).toMatch(/^[1-9A-HJ-NP-Za-km-z]+$/);
    expect(LOCAL_SOLANA_CONSUMER_PROGRAM_ID).toMatch(/^[1-9A-HJ-NP-Za-km-z]+$/);
    expect(SOLANA_GATE_DEPLOYMENT_NOTICE.toLowerCase()).toContain("not deployed");
    expect(SOLANA_ONCHAIN_GATE_FLOW).toContain("Ed25519");
    expect(SOLANA_ONCHAIN_GATE_FLOW).not.toMatch(/mainnet deployed/i);
    const accounts = buildAuthorizeAccountKeys({
      payer: admin,
      config,
      authorization: auth,
    });
    expect(accounts).toHaveLength(5);
    expect(accounts[0]?.isSigner).toBe(true);
  });

  it("builds an Ed25519 verify instruction around the canonical 468-byte message", () => {
    const seed = new Uint8Array(32).fill(3);
    const pair = nacl.sign.keyPair.fromSeed(seed);
    const fields = {
      schemaVersion: 2 as const,
      networkId: (`0x${"11".repeat(32)}`) as `0x${string}`,
      partnerHash: (`0x${"12".repeat(32)}`) as `0x${string}`,
      policyHash: (`0x${"13".repeat(32)}`) as `0x${string}`,
      actionHash: (`0x${"14".repeat(32)}`) as `0x${string}`,
      subjectHash: (`0x${"15".repeat(32)}`) as `0x${string}`,
      issuedAt: 1000,
      expiresAt: 2000,
      nonce: (`0x${"16".repeat(32)}`) as `0x${string}`,
      attestationId: (`0x${"17".repeat(32)}`) as `0x${string}`,
      environment: (`0x${"18".repeat(32)}`) as `0x${string}`,
      signerKeyId: (`0x${"19".repeat(32)}`) as `0x${string}`,
      organizationCommitment: (`0x${"00".repeat(32)}`) as `0x${string}`,
      actorCommitment: (`0x${"00".repeat(32)}`) as `0x${string}`,
      institutionalResultCategory: (`0x${"00".repeat(32)}`) as `0x${string}`,
    };
    const message = encodeSolanaEligibilityMessage(fields);
    expect(message.length).toBe(468);
    expect(new TextDecoder().decode(message.slice(0, SOLANA_ATTESTATION_MESSAGE_PREFIX.length))).toBe(
      SOLANA_ATTESTATION_MESSAGE_PREFIX,
    );
    const signature = nacl.sign.detached(message, pair.secretKey);
    const layout = buildSolanaEd25519VerifyInstructionData({
      publicKey: pair.publicKey,
      signature,
      message,
    });
    expect(layout.instructionData[0]).toBe(1);
    const ix = buildEd25519VerifyInstruction({
      publicKey: pair.publicKey,
      signature,
      message,
    });
    expect(ix.programId.equals(new PublicKey("Ed25519SigVerify111111111111111111111111111"))).toBe(true);
    expect(ix.keys).toEqual([]);
    expect(JSON.stringify(layout)).not.toMatch(/receipt|evidence|wallet_address|private_key/i);
  });
});
