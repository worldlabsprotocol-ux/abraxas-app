import {
  verifyAbraxasReceiptIndependently,
  type IndependentVerificationResult,
  type TrustAnchorBundleV1,
} from "@abraxas/independent-verifier";
import { loadReceiptSigningKey } from "@/lib/decisionReceipts/signing";
import type { PartnerHarnessCaseResult } from "@/lib/partner/launchpad/partnerTestHarness";
import { harnessIssuedReceiptFields } from "@/lib/partner/launchpad/blockchainNative/runPrototypeHarness";
import {
  fetchCommitmentChainEvidenceFromRpc,
  type FetchChainEvidenceInput,
} from "@/lib/solana/proofContinuity/fetchChainEvidence";
import { verifyOnChainReceiptCommitment } from "@/lib/solana/proofContinuity/verifyOnChainCommitment";

export type BlockchainNativeExecutionBundleResult =
  | {
      ok: true;
      receipt_id: string;
      payload_hash_hex: string;
      portable: IndependentVerificationResult;
      chain_status_version: bigint;
      observation_slot: number;
      transaction_signature: string | null;
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
  fetch: FetchChainEvidenceInput;
}): Promise<BlockchainNativeExecutionBundleResult> {
  const issued = harnessIssuedReceiptFields(input.harness);
  if (!issued) return { ok: false, code: "portable_receipt_missing_payload_hash" };

  const signingKey = loadReceiptSigningKey();
  if (!signingKey) return { ok: false, code: "authorized_issuer_key_required" };

  const persistence = input.harness.persistence;
  if (!persistence) return { ok: false, code: "portable_receipt_missing_payload_hash" };

  const portable = verifyAbraxasReceiptIndependently({
    record: persistence.public_payload as Parameters<typeof verifyAbraxasReceiptIndependently>[0]["record"],
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
  });

  if (!portable.cryptographically_authentic) {
    return { ok: false, code: "portable_signature_not_authentic" };
  }

  const fetched = await fetchCommitmentChainEvidenceFromRpc({
    ...input.fetch,
    receiptId: issued.receipt_id,
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