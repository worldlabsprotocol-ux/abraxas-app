import {
  authorityCheckpointFromStatement,
  verifyAbraxasReceiptIndependently,
  type IndependentVerificationResult,
  type TrustAnchorBundleV1,
} from "@abraxas/independent-verifier";
import { loadReceiptSigningKey } from "@/lib/decisionReceipts/signing";
import type { PartnerHarnessCaseResult } from "@/lib/partner/launchpad/partnerTestHarness";
import { harnessIssuedReceiptFields } from "@/lib/partner/launchpad/blockchainNative/runPrototypeHarness";
import { fetchCommitmentChainEvidenceFromRpc } from "@/lib/solana/proofContinuity/fetchChainEvidence";
import { verifyOnChainReceiptCommitment } from "@/lib/solana/proofContinuity/verifyOnChainCommitment";
import { encodeCommitmentMessage, hashReceiptId, hashScopeId } from "@/lib/solana/proofContinuity/message";
import { findProofRegistryPda, findReceiptCommitmentPda } from "@/lib/solana/proofContinuity/pda";
import { PublicKey } from "@solana/web3.js";
import { independentVerificationFullyAccepts } from "./independentAcceptance";
import { harnessPersistenceToDecisionRecord } from "./studioHarnessRestore";
import { toIndependentVerifierRecord } from "@/lib/decisionReceipts/independentVerifierBridge";

export type BlockchainNativeExecutionBundleResult =
  | {
      ok: true;
      receipt_id: string;
      payload_hash_hex: string;
      portable: IndependentVerificationResult;
      chain_status_version: bigint;
      observation_slot: number;
      transaction_signature: string;
    }
  | { ok: false; code: string };

export async function verifyBlockchainNativeExecutionBundle(input: {
  harness: PartnerHarnessCaseResult;
  partnerId: string;
  policyId: string;
  policyTemplateId: string;
  pinnedTrustAnchor: TrustAnchorBundleV1;
  signedIssuerAuthority: { payload: unknown; signature: string };
  signedStatusStatement: { payload: { effective_at: string }; signature: string };
  rpcUrl: string;
  registryAdmin: string;
  holderWallet: string;
  executionNonce: bigint;
  transactionSignature: string;
  finalitySlots: number;
}): Promise<BlockchainNativeExecutionBundleResult> {
  const issued = harnessIssuedReceiptFields(input.harness);
  if (!issued) return { ok: false, code: "portable_receipt_missing_payload_hash" };

  const signingKey = loadReceiptSigningKey();
  if (!signingKey) return { ok: false, code: "authorized_issuer_key_required" };

  const persistence = input.harness.persistence;
  if (!persistence) return { ok: false, code: "portable_receipt_missing_payload_hash" };

  const portable = verifyAbraxasReceiptIndependently({
    record: toIndependentVerifierRecord(harnessPersistenceToDecisionRecord(persistence)),
    pinnedTrustAnchor: input.pinnedTrustAnchor,
    signedIssuerAuthority: input.signedIssuerAuthority as Parameters<
      typeof verifyAbraxasReceiptIndependently
    >[0]["signedIssuerAuthority"],
    signedStatusStatement: input.signedStatusStatement as Parameters<
      typeof verifyAbraxasReceiptIndependently
    >[0]["signedStatusStatement"],
    relyingParty: {
      partner_id: input.partnerId,
      policy_id: input.policyId,
      environment: "demo",
    },
    statementObservedAt: input.signedStatusStatement.payload.effective_at,
    ...authorityCheckpointFromStatement(
      input.signedIssuerAuthority as Parameters<typeof authorityCheckpointFromStatement>[0],
    ),
  });

  if (!independentVerificationFullyAccepts(portable)) {
    return { ok: false, code: "portable_independent_verification_not_acceptable" };
  }

  const adminPk = new PublicKey(input.registryAdmin);
  const registry = findProofRegistryPda(adminPk);
  const receiptHash = hashReceiptId(issued.receipt_id);
  const commitment = findReceiptCommitmentPda(registry.address, receiptHash);
  const payloadHash = Buffer.from(issued.payload_hash, "hex");
  const expiresAt = BigInt(Math.floor(Date.parse(persistence.expires_at) / 1000));

  const commitmentMessage = encodeCommitmentMessage({
    receipt_id_hash: receiptHash,
    payload_hash: payloadHash,
    partner_hash: hashScopeId(input.partnerId),
    policy_hash: hashScopeId(input.policyId),
    application_hash: hashScopeId(input.policyTemplateId),
    expires_at: expiresAt,
    status_version: BigInt(1),
    execution_nonce: input.executionNonce,
  });

  const fetched = await fetchCommitmentChainEvidenceFromRpc({
    rpcUrl: input.rpcUrl,
    registryAdmin: input.registryAdmin,
    receiptId: issued.receipt_id,
    transactionSignature: input.transactionSignature,
    finalitySlots: input.finalitySlots,
    executionExpectations: {
      holder: input.holderWallet,
      commitment: commitment.address.toBase58(),
      receiptIdHash: receiptHash,
      payloadHash,
      executionNonce: input.executionNonce,
      expiresAt,
      statusVersion: BigInt(1),
      commitmentMessage,
    },
  });
  if (!fetched.ok) return { ok: false, code: fetched.reason };

  const chain = verifyOnChainReceiptCommitment({
    chainEvidence: fetched.evidence,
    expectations: {
      receipt_id: issued.receipt_id,
      payload_hash_hex: issued.payload_hash,
      partner_id: input.partnerId,
      policy_id: input.policyId,
      application_id: input.policyTemplateId,
    },
    portableVerification: portable,
    authorizedIssuerPublicKeyJwk: signingKey.publicKeyJwk,
  });
  if (!chain.ok) return { ok: false, code: chain.reason };

  return {
    ok: true,
    receipt_id: issued.receipt_id,
    payload_hash_hex: issued.payload_hash,
    portable,
    chain_status_version: chain.status_version,
    observation_slot: fetched.slot,
    transaction_signature: fetched.signature,
  };
}