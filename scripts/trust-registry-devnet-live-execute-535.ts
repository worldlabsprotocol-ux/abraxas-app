#!/usr/bin/env npx tsx
/**
 * Build #535 — authorized devnet lifecycle (deploy assumed complete).
 * Never logs key material.
 */
import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { anchorGlobalDiscriminator } from "@/lib/solana/trustRegistry/idl/anchorDiscriminator";
import { ABRAXAS_TRUST_REGISTRY_PROGRAM_ID } from "@/lib/solana/trustRegistry/constants";
import { decodeCommitmentStateAccount } from "@/lib/solana/trustRegistry/decodeCommitmentState";
import {
  deriveCommitmentStatePda,
  deriveTrustPolicyPda,
  deriveTrustRegistryPda,
} from "@/lib/solana/trustRegistry/pda";
import { buildReceiptCommitmentDigest } from "@/lib/decisionReceipts/solanaCommitment/digest";
import { verifyProgramEnforcedTrustState } from "@/lib/protocol/trust/independent/verifyProgramEnforcedTrust";

const PROGRAM_ID = new PublicKey(ABRAXAS_TRUST_REGISTRY_PROGRAM_ID);
const OUT = "/opt/cursor/artifacts/trust-registry-devnet-live-session-535.json";
const EVIDENCE = "/opt/cursor/artifacts/trust-registry-devnet-live-execution-v535.json";

function loadKeypair(path: string): Keypair {
  const raw = JSON.parse(readFileSync(path, "utf8")) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

function ixDisc(name: string, args: Buffer): Buffer {
  return Buffer.concat([anchorGlobalDiscriminator(name), args]);
}

function u32le(n: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n, 0);
  return b;
}

function u64le(n: bigint): Buffer {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(n, 0);
  return b;
}

function bytes32(hexOrFill: string | number): Buffer {
  if (typeof hexOrFill === "number") return Buffer.alloc(32, hexOrFill);
  return Buffer.from(hexOrFill, "hex");
}

async function send(
  connection: Connection,
  payer: Keypair,
  signers: Keypair[],
  instructions: TransactionInstruction[],
  label: string,
): Promise<string> {
  const tx = new Transaction().add(...instructions);
  const unique = [payer, ...signers].filter(
    (k, i, arr) => arr.findIndex((x) => x.publicKey.equals(k.publicKey)) === i,
  );
  const sig = await sendAndConfirmTransaction(connection, tx, unique, {
    commitment: "finalized",
    skipPreflight: false,
  });
  console.log(JSON.stringify({ step: label, signature: sig }));
  return sig;
}

async function main() {
  if (process.env.ABRAXAS_TRUST_REGISTRY_DEPLOY_AUTHORIZED !== "true") {
    throw new Error("deploy_not_authorized");
  }
  const payerPath = process.env.SOLANA_DEPLOY_WALLET;
  if (!payerPath) throw new Error("missing_SOLANA_DEPLOY_WALLET");

  const rpc = process.env.SOLANA_DEVNET_RPC_URL ?? "https://api.devnet.solana.com";
  const connection = new Connection(rpc, "finalized");
  const payer = loadKeypair(payerPath);
  const attacker = Keypair.generate();

  // Synthetic devnet-only test domain (documented, non-PII)
  const registryDomain = createHash("sha256").update("abraxas:trust_registry:devnet:v535").digest();
  const policyCommitment = createHash("sha256").update("abraxas:synthetic_policy:devnet:v535").digest();
  const receiptPayloadHash = createHash("sha256").update("abraxas:synthetic_receipt_payload:v535").digest("hex");
  const commitmentDigestHex = buildReceiptCommitmentDigest(receiptPayloadHash);
  const commitmentDigest = Buffer.from(commitmentDigestHex, "hex");

  const [registry] = deriveTrustRegistryPda(registryDomain, PROGRAM_ID);
  const [policy] = deriveTrustPolicyPda(registry, policyCommitment, PROGRAM_ID);
  const [commitmentState] = deriveCommitmentStatePda(registry, commitmentDigest, PROGRAM_ID);

  const evidence: Record<string, unknown> = {
    schema: "trust_registry_devnet_live_execution_v535",
    program_id: PROGRAM_ID.toBase58(),
    registry_domain_hex: registryDomain.toString("hex"),
    policy_commitment_hex: policyCommitment.toString("hex"),
    receipt_payload_hash: receiptPayloadHash,
    commitment_digest_hex: commitmentDigestHex,
    rpc,
    steps: {} as Record<string, unknown>,
  };

  // Airdrop attacker for tx fees only
  const fundAttacker = SystemProgram.transfer({
    fromPubkey: payer.publicKey,
    toPubkey: attacker.publicKey,
    lamports: 50_000_000,
  });
  await send(connection, payer, [], [fundAttacker], "fund_attacker");

  const initIx = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: registry, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: ixDisc("initialize_registry", registryDomain),
  });
  (evidence.steps as Record<string, unknown>).initialize_registry = await send(
    connection,
    payer,
    [],
    [initIx],
    "initialize_registry",
  );

  const registerPolicyIx = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: registry, isSigner: false, isWritable: true },
      { pubkey: policy, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: ixDisc("register_policy", Buffer.concat([policyCommitment, u32le(1)])),
  });
  (evidence.steps as Record<string, unknown>).register_policy = await send(
    connection,
    payer,
    [],
    [registerPolicyIx],
    "register_policy",
  );

  const govMeta = (data: Buffer) =>
    new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: payer.publicKey, isSigner: true, isWritable: false },
        { pubkey: registry, isSigner: false, isWritable: true },
      ],
      data,
    });

  (evidence.steps as Record<string, unknown>).add_commitment_publisher = await send(
    connection,
    payer,
    [],
    [
      govMeta(
        ixDisc(
          "add_commitment_publisher",
          Buffer.concat([bytes32(1), payer.publicKey.toBuffer()]),
        ),
      ),
    ],
    "add_commitment_publisher",
  );

  (evidence.steps as Record<string, unknown>).add_revoker = await send(
    connection,
    payer,
    [],
    [
      govMeta(
        ixDisc("add_revoker", Buffer.concat([bytes32(2), payer.publicKey.toBuffer()])),
      ),
    ],
    "add_revoker",
  );

  const publishIx = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: registry, isSigner: false, isWritable: true },
      { pubkey: policy, isSigner: false, isWritable: false },
      { pubkey: commitmentState, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: ixDisc("publish_commitment", Buffer.concat([commitmentDigest, u64le(1n)])),
  });
  (evidence.steps as Record<string, unknown>).publish_commitment = await send(
    connection,
    payer,
    [],
    [publishIx],
    "publish_commitment",
  );

  const activeAccount = await connection.getAccountInfo(commitmentState, "finalized");
  const activeDecoded = activeAccount ? decodeCommitmentStateAccount(Buffer.from(activeAccount.data)) : null;
  const permitWhileActive = await verifyProgramEnforcedTrustState({
    receiptPayloadHash,
    policyCommitmentHash: policyCommitment.toString("hex"),
    registryDomainHex: registryDomain.toString("hex"),
    rpcUrl: rpc,
    expectedProgramId: PROGRAM_ID.toBase58(),
    rejectMemoOnlyRevocation: true,
  });
  (evidence.steps as Record<string, unknown>).active_observation = {
    status: activeDecoded?.status ?? null,
    slot: Number(activeDecoded?.updated_slot ?? 0n),
    independent_verifier_outcome: permitWhileActive.outcome,
  };

  const unauthorizedRevokeIx = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: attacker.publicKey, isSigner: true, isWritable: false },
      { pubkey: registry, isSigner: false, isWritable: false },
      { pubkey: commitmentState, isSigner: false, isWritable: true },
    ],
    data: ixDisc("revoke_commitment", u64le(2n)),
  });

  let unauthorizedRejected = false;
  try {
    await send(connection, attacker, [], [unauthorizedRevokeIx], "unauthorized_revoke_attempt");
  } catch {
    unauthorizedRejected = true;
  }
  (evidence.steps as Record<string, unknown>).unauthorized_revoke_rejected = unauthorizedRejected;

  const authorizedRevokeIx = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: false },
      { pubkey: registry, isSigner: false, isWritable: false },
      { pubkey: commitmentState, isSigner: false, isWritable: true },
    ],
    data: ixDisc("revoke_commitment", u64le(2n)),
  });
  (evidence.steps as Record<string, unknown>).authorized_revoke = await send(
    connection,
    payer,
    [],
    [authorizedRevokeIx],
    "authorized_revoke",
  );

  const revokedAccount = await connection.getAccountInfo(commitmentState, "finalized");
  const revokedDecoded = revokedAccount ? decodeCommitmentStateAccount(Buffer.from(revokedAccount.data)) : null;
  (evidence.steps as Record<string, unknown>).revoked_observation = {
    status: revokedDecoded?.status ?? null,
    sequence: revokedDecoded?.sequence?.toString() ?? null,
  };

  // Stale sequence replay attempt
  let staleRejected = false;
  try {
    const staleIx = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: payer.publicKey, isSigner: true, isWritable: false },
        { pubkey: registry, isSigner: false, isWritable: false },
        { pubkey: commitmentState, isSigner: false, isWritable: true },
      ],
      data: ixDisc("revoke_commitment", u64le(1n)),
    });
    await send(connection, payer, [], [staleIx], "stale_sequence_attempt");
  } catch {
    staleRejected = true;
  }
  (evidence.steps as Record<string, unknown>).stale_sequence_rejected = staleRejected;

  // After revoke — expect DENY
  const denyAfterRevoke = await verifyProgramEnforcedTrustState({
    receiptPayloadHash,
    policyCommitmentHash: policyCommitment.toString("hex"),
    registryDomainHex: registryDomain.toString("hex"),
    rpcUrl: rpc,
    expectedProgramId: PROGRAM_ID.toBase58(),
    rejectMemoOnlyRevocation: true,
  });

  (evidence.steps as Record<string, unknown>).independent_verifier = {
    post_revoke_outcome: denyAfterRevoke.outcome,
    post_revoke_reasons: denyAfterRevoke.reasons,
    commitment_state_pda: denyAfterRevoke.commitment_state_pda,
  };

  evidence.verdict = {
    active_on_chain: activeDecoded?.status === "ACTIVE",
    unauthorized_revoke_rejected: unauthorizedRejected,
    revoked_on_chain: revokedDecoded?.status === "REVOKED",
    stale_sequence_rejected: staleRejected,
    fail_closed_after_revoke: denyAfterRevoke.outcome === "DENY",
    permit_while_active: permitWhileActive.outcome === "PERMIT",
  };

  mkdirSync("/opt/cursor/artifacts", { recursive: true });
  writeFileSync(OUT, JSON.stringify({
    registry_domain_hex: registryDomain.toString("hex"),
    receipt_payload_hash: receiptPayloadHash,
    policy_commitment_hash: policyCommitment.toString("hex"),
    program_id: PROGRAM_ID.toBase58(),
    expected_status: "REVOKED",
  }, null, 2));
  writeFileSync(EVIDENCE, JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ evidence: EVIDENCE, session: OUT, verdict: evidence.verdict }, null, 2));
}

main().catch((e) => {
  console.error(JSON.stringify({ error: String(e) }));
  process.exit(1);
});
