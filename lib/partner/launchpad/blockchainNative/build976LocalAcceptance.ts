import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Connection, Keypair, Transaction } from "@solana/web3.js";
import {
  RECEIPT_STATUS_STATEMENT_DOCUMENT,
  RECEIPT_STATUS_STATEMENT_SCHEMA_VERSION,
  signReceiptStatusStatementForTests,
} from "@abraxas/independent-verifier";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { registryEnv } from "@/lib/persistence/boundary/staging/build834Fixtures";
import { publishSignedIssuerAuthorityFromRegistry } from "@/lib/persistence/boundary/issuerAuthority/buildFromRegistry";
import { hashScopeId } from "@/lib/solana/proofContinuity/message";
import {
  buildInitializeProofRegistryInstruction,
  buildRegisterSandboxBindingInstruction,
} from "@/lib/solana/proofContinuity/buildProofContinuityInstructions";
import { ed25519PublicKey32FromJwk } from "@/lib/solana/proofContinuity/ed25519VerifyInstruction";
import { findProofRegistryPda, proofContinuityProgramId } from "@/lib/solana/proofContinuity/pda";
import { PROOF_CONTINUITY_PROGRAM_ID } from "@/lib/solana/proofContinuity/constants";
import { independentVerificationFullyAccepts } from "./independentAcceptance";
import {
  assertPrepareJtiNotReusedWithOtherTx,
  resetBlockchainNativePrepareBindingStoreForTests,
} from "./prepareBindingStore";
import {
  buildBlockchainNativeStudioTransaction,
  confirmBlockchainNativeStudioExecution,
  prepareBlockchainNativeStudioHarness,
} from "./studioExecution";

export type Build976LocalAcceptanceArtifact = {
  receipt_id: string;
  transaction_signature: string;
  observation_slot: number;
  independent_verification_fully_accepts: boolean;
  registry_admin: string;
  holder_wallet: string;
  execution_mode: "local_holder_keypair";
  browser_wallet_extension: "not_available_in_cloud_runner" | "manual_founder_required";
};

const SOLANA_BIN = process.env.SOLANA_INSTALL_PATH
  ?? join(process.env.HOME ?? "", ".local/share/solana/install/active_release/bin");
const PATH_PREFIX = `${SOLANA_BIN}:${process.env.PATH ?? ""}`;
const PARTNER_ID = "partner-build976-local";
const POLICY_ID = "policy-build976-local";
const POLICY_TEMPLATE_ID = "wallet_control";
const APPLICATION_ID = "00000000-0000-4000-8000-000000009760";
const RPC = "http://127.0.0.1:8899";
const PROGRAM_SO = join(process.cwd(), "solana/abraxas-eligibility-gate/target/deploy/abraxas_proof_continuity.so");

function run(cmd: string, args: string[]) {
  const result = spawnSync(cmd, args, {
    env: { ...process.env, PATH: PATH_PREFIX },
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} failed: ${result.stderr || result.stdout}`);
  }
}

async function rpcLive(): Promise<boolean> {
  try {
    await new Connection(RPC, "confirmed").getVersion();
    return true;
  } catch {
    return false;
  }
}

async function validatorReady(): Promise<boolean> {
  if (!(await rpcLive())) return false;
  const connection = new Connection(RPC, "confirmed");
  const slot = await connection.getSlot("confirmed");
  if (slot < 2) return false;
  const program = await connection.getAccountInfo(proofContinuityProgramId(), "confirmed");
  return Boolean(program?.executable);
}

async function ensureValidator(): Promise<void> {
  spawnSync("pkill", ["-f", "solana-test-validator"], { stdio: "ignore" });
  await new Promise((r) => setTimeout(r, 800));
  if (!existsSync(PROGRAM_SO)) {
    run("cargo", [
      "build-sbf",
      "--manifest-path",
      "solana/abraxas-eligibility-gate/programs/abraxas-proof-continuity/Cargo.toml",
    ]);
  }
  const ledgerDir = "/tmp/abraxas-build976-test-ledger";
  const validator = spawn(
    "solana-test-validator",
    [
      "--ledger",
      ledgerDir,
      "--reset",
      "--quiet",
      "--rpc-port",
      "8899",
      "--faucet-sol",
      "1000000",
      "--bpf-program",
      PROOF_CONTINUITY_PROGRAM_ID,
      PROGRAM_SO,
    ],
    { env: { ...process.env, PATH: PATH_PREFIX }, detached: true, stdio: "ignore" },
  );
  validator.unref();
  for (let i = 0; i < 120; i += 1) {
    await new Promise((r) => setTimeout(r, 500));
    if (await validatorReady()) return;
  }
  throw new Error("solana_test_validator_start_timeout");
}

function signedActiveStatus(receiptId: string): void {
  const statusKey = JSON.parse(process.env.ABRAXAS_STATUS_SIGNER_PRIVATE_JWK ?? "null") as JsonWebKey;
  process.env.ABRAXAS_SIGNED_STATUS_STATEMENT_JSON = JSON.stringify(
    signReceiptStatusStatementForTests({
      payload: {
        document: RECEIPT_STATUS_STATEMENT_DOCUMENT,
        schema_version: RECEIPT_STATUS_STATEMENT_SCHEMA_VERSION,
        receipt_id: receiptId,
        status_reference: receiptId,
        partner_id: PARTNER_ID,
        policy_id: POLICY_ID,
        policy_version: 1,
        environment: "demo",
        status_version: 1,
        supersedes_status_version: null,
        receipt_status: "active",
        superseded: false,
        partner_operational: true,
        policy_active: true,
        claims_current: true,
        evidence_current: true,
        effective_at: new Date().toISOString(),
        issued_at: new Date().toISOString(),
        statement_expires_at: new Date(Date.now() + 3_600_000).toISOString(),
        status_signer_key_id: process.env.ABRAXAS_STATUS_SIGNER_KEY_ID ?? "abraxas-status-signer",
      },
      statusSignerPrivateJwk: statusKey,
    }),
  );
}

function configureTrustEnv(): { admin: Keypair; holder: Keypair; receiptKey: ReturnType<typeof generateTestSigningKeyPair> } {
  const receiptKey = generateTestSigningKeyPair("build976-receipt");
  const anchorKey = generateTestSigningKeyPair("build976-anchor");
  const statusKey = generateTestSigningKeyPair("build976-status");
  Object.assign(process.env, registryEnv(receiptKey, anchorKey, process.env), {
    NODE_ENV: "test",
    VITEST: "true",
    VERCEL_ENV: "development",
    ABRAXAS_PROOF_CONTINUITY_RPC_URL: RPC,
    ABRAXAS_PROOF_CONTINUITY_FINALITY_SLOTS: "0",
    BLOCKCHAIN_NATIVE_PREPARE_HMAC_KEY: "build976-local-prepare-hmac-secret-32b",
    ABRAXAS_STATUS_SIGNER_KEY_ID: statusKey.signingKeyId,
    ABRAXAS_STATUS_SIGNER_PRIVATE_JWK: JSON.stringify(statusKey.privateKeyJwk),
    ABRAXAS_STATUS_SIGNER_PUBLIC_JWK: JSON.stringify(statusKey.publicKeyJwk),
  });

  const admin = Keypair.generate();
  const holder = Keypair.generate();
  process.env.ABRAXAS_PROOF_CONTINUITY_REGISTRY_ADMIN = admin.publicKey.toBase58();

  const signedIssuer = publishSignedIssuerAuthorityFromRegistry({
    registryVersion: 1,
    anchorKeyId: "build834-trust-anchor",
    anchorPrivateJwk: anchorKey.privateKeyJwk,
    env: process.env,
  });
  if (!("payload" in signedIssuer)) throw new Error(String(signedIssuer.reason));
  process.env.ABRAXAS_SIGNED_ISSUER_AUTHORITY_JSON = JSON.stringify(signedIssuer);
  return { admin, holder, receiptKey };
}

async function fund(connection: Connection, address: Keypair): Promise<void> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const cli = spawnSync(
      "solana",
      ["airdrop", "5", address.publicKey.toBase58(), "-u", RPC],
      { env: { ...process.env, PATH: PATH_PREFIX }, encoding: "utf8" },
    );
    const balance = await connection.getBalance(address.publicKey, "confirmed");
    if (cli.status === 0 && balance > 0) return;
    await new Promise((r) => setTimeout(r, 800));
  }
  throw new Error(`airdrop_failed:${address.publicKey.toBase58()}`);
}

async function ensureRegistryInitialized(
  admin: Keypair,
  holder: Keypair,
  receiptKey: ReturnType<typeof generateTestSigningKeyPair>,
): Promise<void> {
  const connection = new Connection(RPC, "confirmed");
  await fund(connection, admin);
  await fund(connection, holder);
  if ((await connection.getBalance(admin.publicKey, "confirmed")) === 0) {
    throw new Error("admin_not_funded");
  }
  const registry = findProofRegistryPda(admin.publicKey);
  if (await connection.getAccountInfo(registry.address, "finalized")) return;

  const realIssuer = ed25519PublicKey32FromJwk(receiptKey.publicKeyJwk);
  if (!realIssuer) throw new Error("issuer_pubkey_unavailable");

  const initOnly = new Transaction().add(
    buildInitializeProofRegistryInstruction({
      admin: admin.publicKey,
      trustedIssuerPubkey32: realIssuer,
      partnerId: PARTNER_ID,
      policyId: POLICY_ID,
      applicationId: POLICY_TEMPLATE_ID,
    }),
  );
  initOnly.feePayer = admin.publicKey;
  initOnly.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  initOnly.sign(admin);
  const initSig = await connection.sendRawTransaction(initOnly.serialize());
  await connection.confirmTransaction(initSig, "confirmed");

  const registerOnly = new Transaction().add(
    buildRegisterSandboxBindingInstruction({ registryAdmin: admin.publicKey, holder: holder.publicKey }),
  );
  registerOnly.feePayer = holder.publicKey;
  registerOnly.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  registerOnly.sign(holder);
  const registerSig = await connection.sendRawTransaction(registerOnly.serialize());
  await connection.confirmTransaction(registerSig, "confirmed");
}

async function waitFinalized(connection: Connection, signature: string): Promise<number> {
  for (let i = 0; i < 90; i += 1) {
    const value = (await connection.getSignatureStatuses([signature])).value[0];
    if (value?.err) throw new Error("transaction_failed");
    if (value?.confirmationStatus === "finalized") return value.slot ?? 0;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("finalized_timeout");
}

export async function runBuild976LocalAcceptance(): Promise<Build976LocalAcceptanceArtifact> {
  await ensureValidator();
  const { admin, holder, receiptKey } = configureTrustEnv();
  await ensureRegistryInitialized(admin, holder, receiptKey);
  resetBlockchainNativePrepareBindingStoreForTests();

  const prepared = await prepareBlockchainNativeStudioHarness({
    applicationId: APPLICATION_ID,
    partnerId: PARTNER_ID,
    policyId: POLICY_ID,
    policyVersion: 1,
    policyTemplateId: POLICY_TEMPLATE_ID,
    scenarioId: "approved",
    holderWallet: holder.publicKey.toBase58(),
  });
  if (!prepared.ok) throw new Error(`prepare_failed:${prepared.code}`);
  signedActiveStatus(prepared.receipt_id);

  const built = await buildBlockchainNativeStudioTransaction({
    applicationId: APPLICATION_ID,
    partnerId: PARTNER_ID,
    holderWallet: holder.publicKey.toBase58(),
    prepareToken: prepared.prepare_token,
  });
  if (!built.ok) throw new Error(`build_failed:${built.code}`);

  const connection = new Connection(RPC, "confirmed");
  await fund(connection, holder);
  const tx = Transaction.from(Buffer.from(built.transaction_base64, "base64"));
  tx.partialSign(holder);
  const signature = await connection.sendRawTransaction(tx.serialize());
  const slot = await waitFinalized(connection, signature);

  const confirmed = await confirmBlockchainNativeStudioExecution({
    applicationId: APPLICATION_ID,
    partnerId: PARTNER_ID,
    policyId: POLICY_ID,
    policyTemplateId: POLICY_TEMPLATE_ID,
    holderWallet: holder.publicKey.toBase58(),
    prepareToken: prepared.prepare_token,
    transactionSignature: signature,
  });
  if (!confirmed.ok) throw new Error(`confirm_failed:${confirmed.code}`);
  if (!independentVerificationFullyAccepts(confirmed.portable)) {
    throw new Error("independent_verification_not_fully_accepted");
  }

  const duplicate = await confirmBlockchainNativeStudioExecution({
    applicationId: APPLICATION_ID,
    partnerId: PARTNER_ID,
    policyId: POLICY_ID,
    policyTemplateId: POLICY_TEMPLATE_ID,
    holderWallet: holder.publicKey.toBase58(),
    prepareToken: prepared.prepare_token,
    transactionSignature: signature,
  });
  if (!duplicate.ok) throw new Error(`confirm_idempotent_failed:${duplicate.code}`);

  const replayA = await assertPrepareJtiNotReusedWithOtherTx({ jti: "build976-local-jti", transactionSignature: "sig-a", ttlSec: 300 });
  const replayB = await assertPrepareJtiNotReusedWithOtherTx({ jti: "build976-local-jti", transactionSignature: "sig-b", ttlSec: 300 });
  if (!replayA.ok || replayB.ok) throw new Error("jti_replay_guard_failed");

  const statusKey = JSON.parse(process.env.ABRAXAS_STATUS_SIGNER_PRIVATE_JWK ?? "null") as JsonWebKey;
  process.env.ABRAXAS_SIGNED_STATUS_STATEMENT_JSON = JSON.stringify(
    signReceiptStatusStatementForTests({
      payload: {
        document: RECEIPT_STATUS_STATEMENT_DOCUMENT,
        schema_version: RECEIPT_STATUS_STATEMENT_SCHEMA_VERSION,
        receipt_id: prepared.receipt_id,
        status_reference: prepared.receipt_id,
        partner_id: PARTNER_ID,
        policy_id: POLICY_ID,
        policy_version: 1,
        environment: "demo",
        status_version: 2,
        supersedes_status_version: 1,
        receipt_status: "revoked",
        superseded: false,
        partner_operational: true,
        policy_active: true,
        claims_current: false,
        evidence_current: true,
        effective_at: new Date().toISOString(),
        issued_at: new Date().toISOString(),
        statement_expires_at: new Date(Date.now() + 3_600_000).toISOString(),
        status_signer_key_id: process.env.ABRAXAS_STATUS_SIGNER_KEY_ID ?? "abraxas-status-signer",
      },
      statusSignerPrivateJwk: statusKey,
    }),
  );
  const revokedRetry = await confirmBlockchainNativeStudioExecution({
    applicationId: APPLICATION_ID,
    partnerId: PARTNER_ID,
    policyId: POLICY_ID,
    policyTemplateId: POLICY_TEMPLATE_ID,
    holderWallet: holder.publicKey.toBase58(),
    prepareToken: prepared.prepare_token,
    transactionSignature: signature,
  });
  if (revokedRetry.ok) throw new Error("cached_confirm_must_not_bypass_revocation");

  const artifact: Build976LocalAcceptanceArtifact = {
    receipt_id: confirmed.receipt_id,
    transaction_signature: signature,
    observation_slot: slot,
    independent_verification_fully_accepts: true,
    registry_admin: admin.publicKey.toBase58(),
    holder_wallet: holder.publicKey.toBase58(),
    execution_mode: "local_holder_keypair",
    browser_wallet_extension: "not_available_in_cloud_runner",
  };

  mkdirSync("/opt/cursor/artifacts", { recursive: true });
  writeFileSync(
    "/opt/cursor/artifacts/build976-local-acceptance.json",
    `${JSON.stringify({ ...artifact, partner_scope_hash: hashScopeId(PARTNER_ID).toString("hex") }, null, 2)}\n`,
  );
  return artifact;
}