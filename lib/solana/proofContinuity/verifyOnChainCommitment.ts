import type { IndependentVerificationResult } from "../../../packages/abraxas-independent-verifier/src/verifyIndependent";
import { commitmentIsCurrentlyAcceptable, decodeReceiptCommitmentAccount } from "./decodeCommitment";
import { hashReceiptId, hashScopeId } from "./message";

export type OnChainCommitmentExpectations = {
  receipt_id: string;
  payload_hash_hex: string;
  partner_id: string;
  policy_id: string;
  application_id: string;
};

export type OnChainCommitmentVerificationResult =
  | { ok: true; status_version: bigint }
  | { ok: false; reason: string };

/** Optional adapter — fails closed when chain evidence is missing or inconsistent. */
export function verifyOnChainReceiptCommitment(input: {
  commitmentAccountData: Buffer;
  expectations: OnChainCommitmentExpectations;
  now?: Date;
  portableVerification?: IndependentVerificationResult;
}): OnChainCommitmentVerificationResult {
  if (input.portableVerification
    && !input.portableVerification.cryptographically_authentic) {
    return { ok: false, reason: "portable_signature_not_authentic" };
  }
  const decoded = decodeReceiptCommitmentAccount(input.commitmentAccountData);
  if (!decoded) return { ok: false, reason: "on_chain_commitment_decode_failed" };

  const receiptHash = hashReceiptId(input.expectations.receipt_id).toString("hex");
  if (decoded.receipt_id_hash !== receiptHash) {
    return { ok: false, reason: "on_chain_receipt_mismatch" };
  }
  const payload = input.expectations.payload_hash_hex.replace(/^0x/, "").toLowerCase();
  if (decoded.payload_hash !== payload && decoded.payload_hash !== payload.padStart(64, "0")) {
    return { ok: false, reason: "on_chain_payload_mismatch" };
  }
  if (decoded.partner_hash !== hashScopeId(input.expectations.partner_id).toString("hex")) {
    return { ok: false, reason: "on_chain_partner_mismatch" };
  }
  if (decoded.policy_hash !== hashScopeId(input.expectations.policy_id).toString("hex")) {
    return { ok: false, reason: "on_chain_policy_mismatch" };
  }
  if (decoded.application_hash !== hashScopeId(input.expectations.application_id).toString("hex")) {
    return { ok: false, reason: "on_chain_application_mismatch" };
  }

  const fresh = commitmentIsCurrentlyAcceptable(decoded, Math.floor((input.now ?? new Date()).getTime() / 1000));
  if (!fresh.ok) return { ok: false, reason: fresh.reason };

  return { ok: true, status_version: decoded.status_version };
}