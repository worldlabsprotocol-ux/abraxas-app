import {
  runPartnerHarnessCase,
  type PartnerHarnessCaseResult,
} from "@/lib/partner/launchpad/partnerTestHarness";
import {
  loadReceiptSigningKey,
  type ReceiptSigningKeyPair,
} from "@/lib/decisionReceipts/signing";
import { hashReceiptId } from "@/lib/solana/proofContinuity/message";
import { verifyOnChainReceiptCommitment } from "@/lib/solana/proofContinuity/verifyOnChainCommitment";
import type { CommitmentChainEvidence } from "@/lib/solana/proofContinuity/solanaAccountEvidence";
import type { IndependentVerificationResult } from "../../../../packages/abraxas-independent-verifier/src/verifyIndependent";
import {
  BLOCKCHAIN_NATIVE_ADAPTER_LABEL,
  isBlockchainNativePrototypeEnabled,
  OFF_CHAIN_EVIDENCE_MECHANISM,
} from "./contract";

export type BlockchainNativeHarnessInput = {
  partnerId: string;
  policyId: string;
  policyVersion: number;
  policyTemplateId: string;
  scenarioId: string;
  executionNonce: bigint;
  /** Explicit authorized issuer — no ephemeral keys inside the adapter. */
  signingKey?: ReceiptSigningKeyPair;
  chainEvidence: CommitmentChainEvidence;
  /** Portable independent verification of the same harness issuance. */
  portableVerification: IndependentVerificationResult;
  harnessResult?: PartnerHarnessCaseResult;
};

export type BlockchainNativeHarnessResult =
  | {
      ok: true;
      adapter: typeof BLOCKCHAIN_NATIVE_ADAPTER_LABEL;
      receipt_id: string;
      payload_hash_hex: string;
      portable_evidence: string;
      on_chain_status_version: bigint;
      execution_nonce: bigint;
    }
  | { ok: false; code: string };

function isInvalidHarnessScenario(
  result: PartnerHarnessCaseResult | { ok: false; code: "invalid_scenario" },
): result is { ok: false; code: "invalid_scenario" } {
  return "ok" in result && result.ok === false;
}

export function harnessIssuedReceiptFields(
  harness: PartnerHarnessCaseResult,
): { receipt_id: string; payload_hash: string } | null {
  const persistence = harness.persistence;
  if (!persistence) return null;
  const payloadHash = (persistence.public_payload as { payload_hash?: string }).payload_hash;
  if (!payloadHash) return null;
  return { receipt_id: persistence.receipt_id, payload_hash: payloadHash };
}

function resolveAuthorizedSigningKey(
  explicit?: ReceiptSigningKeyPair,
): ReceiptSigningKeyPair | null {
  if (explicit) return explicit;
  return loadReceiptSigningKey();
}

/**
 * Blockchain-native execution adapter — parallel to `runLaunchpadTestScenario`, not a bypass.
 * Default hosted Launchpad still requires sovereign PostgreSQL.
 */
export function runBlockchainNativePrototypeHarness(
  input: BlockchainNativeHarnessInput,
): BlockchainNativeHarnessResult {
  if (!isBlockchainNativePrototypeEnabled()) {
    return { ok: false, code: "blockchain_native_prototype_disabled" };
  }

  const signingKey = resolveAuthorizedSigningKey(input.signingKey);
  if (!signingKey) {
    return { ok: false, code: "authorized_issuer_key_required" };
  }

  if (!input.portableVerification.cryptographically_authentic) {
    return { ok: false, code: "portable_signature_not_authentic" };
  }

  const harness =
    input.harnessResult
    ?? runPartnerHarnessCase({
      partnerId: input.partnerId,
      policyId: input.policyId,
      policyVersion: input.policyVersion,
      policyTemplateId: input.policyTemplateId,
      scenarioId: input.scenarioId,
      signingKey,
      signingSource: "configured_issuer_key",
    });

  if (isInvalidHarnessScenario(harness)) {
    return { ok: false, code: harness.code };
  }

  const issued = harnessIssuedReceiptFields(harness);
  if (!issued) return { ok: false, code: "portable_receipt_missing_payload_hash" };

  const receiptHash = hashReceiptId(issued.receipt_id);
  if (!receiptHash.equals(input.chainEvidence.receiptIdHash)) {
    return { ok: false, code: "chain_portable_receipt_id_mismatch" };
  }

  const chain = verifyOnChainReceiptCommitment({
    chainEvidence: input.chainEvidence,
    expectations: {
      receipt_id: issued.receipt_id,
      payload_hash_hex: issued.payload_hash,
      partner_id: input.partnerId,
      policy_id: input.policyId,
      application_id: input.policyTemplateId,
    },
    portableVerification: input.portableVerification,
    authorizedIssuerPublicKeyJwk: signingKey.publicKeyJwk,
  });
  if (!chain.ok) return { ok: false, code: chain.reason };

  return {
    ok: true,
    adapter: BLOCKCHAIN_NATIVE_ADAPTER_LABEL,
    receipt_id: issued.receipt_id,
    payload_hash_hex: issued.payload_hash,
    portable_evidence: OFF_CHAIN_EVIDENCE_MECHANISM,
    on_chain_status_version: chain.status_version,
    execution_nonce: input.executionNonce,
  };
}

export function receiptIdHashHex(receiptId: string): string {
  return hashReceiptId(receiptId).toString("hex");
}