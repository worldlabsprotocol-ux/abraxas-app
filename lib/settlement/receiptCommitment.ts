// FILE: lib/settlement/receiptCommitment.ts
// Domain separated receipt commitment for onchain references.
//
// The commitment proves Abraxas issued a specific eligibility receipt payload hash.
// It does NOT prove identity attributes, legal name, birth date, or raw policy results.
// Putting a hash onchain does not make personal information anonymous.

import { keccak256, encodePacked, toBytes, stringToHex } from "viem";

const RECEIPT_COMMITMENT_DOMAIN = "abraxas:settlement:receipt:v1";

export function computeReceiptCommitmentFromPayloadHash(payloadHash: string): `0x${string}` {
  const normalized = payloadHash.startsWith("0x") ? payloadHash.slice(2) : payloadHash;
  if (!/^[a-f0-9]{64}$/i.test(normalized)) {
    throw new Error("invalid_receipt_payload_hash");
  }
  const payloadHashBytes = `0x${normalized}` as `0x${string}`;
  return keccak256(
    encodePacked(
      ["string", "bytes32"],
      [RECEIPT_COMMITMENT_DOMAIN, payloadHashBytes],
    ),
  );
}

export function hashSettlementReference(reference: string): `0x${string}` {
  const trimmed = reference.trim();
  if (!trimmed || trimmed.length > 128) {
    throw new Error("invalid_settlement_reference");
  }
  return keccak256(toBytes(trimmed));
}

export function hashPartnerIdForSettlement(partnerId: string): `0x${string}` {
  return keccak256(stringToHex(partnerId));
}

export function hashPolicyIdForSettlement(policyId: string): `0x${string}` {
  return keccak256(stringToHex(policyId));
}

export function applicationIdToBytes32(applicationId: string): `0x${string}` {
  const trimmed = applicationId.trim();
  if (!trimmed) throw new Error("invalid_application_id");
  return keccak256(stringToHex(trimmed));
}

export const RECEIPT_COMMITMENT_DOCUMENTATION = {
  proves: [
    "Abraxas signed a specific eligibility receipt payload hash at issuance time",
    "The settlement authorization references that receipt commitment",
  ],
  doesNotProve: [
    "Legal name, birth date, email, or document information",
    "Raw credential values or OAuth subjects",
    "That the holder is anonymous because a hash appears onchain",
    "Future policy changes or receipt revocation without offchain checks",
  ],
};
