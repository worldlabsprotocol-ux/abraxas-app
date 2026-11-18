import { Connection, PublicKey } from "@solana/web3.js";
import { loadReceiptSigningKey } from "@/lib/decisionReceipts/signing";
import {
  runPartnerHarnessCase,
  type PartnerHarnessCaseResult,
} from "@/lib/partner/launchpad/partnerTestHarness";
import { hashReceiptId } from "@/lib/solana/proofContinuity/message";
import { findProofRegistryPda, findReceiptCommitmentPda } from "@/lib/solana/proofContinuity/pda";
import {
  blockchainNativeFinalitySlots,
  blockchainNativeRegistryAdmin,
  blockchainNativeStudioRpcUrl,
  isBlockchainNativeStudioConfigured,
} from "./studioConfig";
import { verifyBlockchainNativeExecutionBundle } from "./verifyExecutionBundle";
import { buildDemoTrustAnchorFromEnv } from "@/lib/partner/trustExecution/verifyTrustExecutionMaterial";
import {
  partnerHarnessFromPortablePersistence,
  type PortableHarnessPersistence,
} from "./studioHarnessRestore";
import { issuePrepareBindingToken, verifyPrepareBindingToken } from "./prepareBinding";
import { buildStudioChainTransaction, readNextExecutionNonce } from "./buildStudioChainTransaction.server";

export function assertBlockchainNativeStudioReady():
  | { ok: true }
  | { ok: false; code: string } {
  if (!isBlockchainNativeStudioConfigured()) return { ok: false, code: "blockchain_native_studio_not_configured" };
  if (!loadReceiptSigningKey()) return { ok: false, code: "authorized_issuer_key_required" };
  return { ok: true };
}

export type BlockchainNativePrepareResult =
  | {
      ok: true;
      prepare_token: string;
      receipt_id: string;
      payload_hash_hex: string;
      execution_nonce: string;
      registry_admin: string;
      registry_pda: string;
      commitment_pda: string;
      receipt_id_hash_hex: string;
      rpc_url: string;
      finality_slots: number;
      holder_wallet: string;
    }
  | { ok: false; code: string };

/** Harness issuance for blockchain-native studio — does not use sovereign PostgreSQL persistence. */
export async function prepareBlockchainNativeStudioHarness(input: {
  applicationId: string;
  partnerId: string;
  policyId: string;
  policyVersion: number;
  policyTemplateId: string;
  scenarioId: string;
  holderWallet: string;
}): Promise<BlockchainNativePrepareResult> {
  const ready = assertBlockchainNativeStudioReady();
  if (!ready.ok) return ready;

  let holderPk: PublicKey;
  try {
    holderPk = new PublicKey(input.holderWallet);
  } catch {
    return { ok: false, code: "holder_wallet_invalid" };
  }

  const signingKey = loadReceiptSigningKey()!;
  const harness = runPartnerHarnessCase({
    partnerId: input.partnerId,
    policyId: input.policyId,
    policyVersion: input.policyVersion,
    policyTemplateId: input.policyTemplateId,
    scenarioId: input.scenarioId,
    signingKey,
    signingSource: "configured_issuer_key",
  });
  if ("ok" in harness && harness.ok === false) return { ok: false, code: harness.code };
  const harnessResult = harness as PartnerHarnessCaseResult;

  const persistence = harnessResult.persistence;
  if (!persistence?.public_payload) return { ok: false, code: "portable_receipt_missing_payload_hash" };
  const payloadHash = (persistence.public_payload as { payload_hash?: string }).payload_hash;
  if (!payloadHash) return { ok: false, code: "portable_receipt_missing_payload_hash" };

  const admin = blockchainNativeRegistryAdmin()!;
  const rpcUrl = blockchainNativeStudioRpcUrl()!;
  const connection = new Connection(rpcUrl, { commitment: "finalized" });
  const adminPk = new PublicKey(admin);
  const executionNonce = await readNextExecutionNonce(connection, adminPk, holderPk);

  const prepareToken = issuePrepareBindingToken({
    application_id: input.applicationId,
    partner_id: input.partnerId,
    policy_id: input.policyId,
    policy_version: input.policyVersion,
    policy_template_id: input.policyTemplateId,
    scenario_id: input.scenarioId,
    holder_wallet: holderPk.toBase58(),
    execution_nonce: executionNonce.toString(),
    receipt_id: persistence.receipt_id,
    payload_hash_hex: payloadHash,
    persistence,
  });
  if (!prepareToken) return { ok: false, code: "prepare_binding_unavailable" };

  const registry = findProofRegistryPda(adminPk);
  const receiptHash = hashReceiptId(persistence.receipt_id);
  const commitment = findReceiptCommitmentPda(registry.address, receiptHash);

  return {
    ok: true,
    prepare_token: prepareToken,
    receipt_id: persistence.receipt_id,
    payload_hash_hex: payloadHash,
    execution_nonce: executionNonce.toString(),
    registry_admin: admin,
    registry_pda: registry.address.toBase58(),
    commitment_pda: commitment.address.toBase58(),
    receipt_id_hash_hex: receiptHash.toString("hex"),
    rpc_url: rpcUrl,
    finality_slots: blockchainNativeFinalitySlots(),
    holder_wallet: holderPk.toBase58(),
  };
}

export async function buildBlockchainNativeStudioTransaction(input: {
  applicationId: string;
  partnerId: string;
  holderWallet: string;
  prepareToken: string;
}) {
  const verified = verifyPrepareBindingToken(input.prepareToken, {
    application_id: input.applicationId,
    partner_id: input.partnerId,
    holder_wallet: input.holderWallet,
    consume: false,
  });
  if (!verified.ok) return verified;
  return buildStudioChainTransaction({
    rpcUrl: blockchainNativeStudioRpcUrl()!,
    registryAdmin: blockchainNativeRegistryAdmin()!,
    binding: verified.binding,
    holderWallet: input.holderWallet,
  });
}

export async function confirmBlockchainNativeStudioExecution(input: {
  applicationId: string;
  partnerId: string;
  policyId: string;
  policyTemplateId: string;
  holderWallet: string;
  prepareToken: string;
  transactionSignature: string;
}) {
  const ready = assertBlockchainNativeStudioReady();
  if (!ready.ok) return ready;

  const signature = input.transactionSignature?.trim();
  if (!signature) return { ok: false as const, code: "chain_transaction_signature_required" };

  const verified = verifyPrepareBindingToken(input.prepareToken, {
    application_id: input.applicationId,
    partner_id: input.partnerId,
    holder_wallet: input.holderWallet,
    consume: true,
  });
  if (!verified.ok) return verified;

  const binding = verified.binding;
  if (binding.policy_id !== input.policyId) return { ok: false as const, code: "prepare_binding_policy_mismatch" };
  if (binding.policy_template_id !== input.policyTemplateId) {
    return { ok: false as const, code: "prepare_binding_application_template_mismatch" };
  }

  const anchor = buildDemoTrustAnchorFromEnv(process.env);
  if (!anchor) return { ok: false as const, code: "trust_anchor_not_configured" };

  const issuerAuthority = process.env.ABRAXAS_SIGNED_ISSUER_AUTHORITY_JSON?.trim();
  const statusStatement = process.env.ABRAXAS_SIGNED_STATUS_STATEMENT_JSON?.trim();
  if (!issuerAuthority || !statusStatement) {
    return { ok: false as const, code: "signed_status_material_required" };
  }

  let signedIssuerAuthority: unknown;
  let signedStatusStatement: unknown;
  try {
    signedIssuerAuthority = JSON.parse(issuerAuthority);
    signedStatusStatement = JSON.parse(statusStatement);
  } catch {
    return { ok: false as const, code: "signed_status_material_invalid" };
  }

  const harness = partnerHarnessFromPortablePersistence(
    binding.persistence,
    binding.scenario_id as import("@/lib/partner/launchpad/partnerTestHarness").PartnerHarnessScenarioId,
  );

  return verifyBlockchainNativeExecutionBundle({
    harness,
    partnerId: input.partnerId,
    policyId: input.policyId,
    policyTemplateId: input.policyTemplateId,
    pinnedTrustAnchor: anchor,
    signedIssuerAuthority: signedIssuerAuthority as { payload: unknown; signature: string },
    signedStatusStatement: signedStatusStatement as { payload: { effective_at: string }; signature: string },
    rpcUrl: blockchainNativeStudioRpcUrl()!,
    registryAdmin: blockchainNativeRegistryAdmin()!,
    holderWallet: input.holderWallet,
    executionNonce: BigInt(binding.execution_nonce),
    transactionSignature: signature,
    finalitySlots: blockchainNativeFinalitySlots(),
  });
}