// Encode partner gate consumeEligibility. Server-issued attestation only.

import { encodeFunctionData } from "viem";
import type { ChainEligibilityAttestationFields } from "@/lib/partner/chainAttestation/contract";
import { ABRAXAS_PARTNER_ELIGIBILITY_GATE_ABI, ABRAXAS_PARTNER_ELIGIBILITY_CONSUMER_ABI } from "./abi";

export function encodeConsumeEligibilityCall(input: {
  fields: ChainEligibilityAttestationFields;
  signature: `0x${string}`;
}): `0x${string}` {
  return encodeFunctionData({
    abi: ABRAXAS_PARTNER_ELIGIBILITY_GATE_ABI,
    functionName: "consumeEligibility",
    args: [
      {
        schemaVersion: BigInt(input.fields.schemaVersion),
        networkId: input.fields.networkId,
        partnerHash: input.fields.partnerHash,
        policyHash: input.fields.policyHash,
        actionHash: input.fields.actionHash,
        subjectHash: input.fields.subjectHash,
        issuedAt: BigInt(input.fields.issuedAt),
        expiresAt: BigInt(input.fields.expiresAt),
        nonce: input.fields.nonce,
        attestationId: input.fields.attestationId,
        environment: input.fields.environment,
        signerKeyId: input.fields.signerKeyId,
      },
      input.signature,
    ],
  });
}

export function encodeRecordNamedActionCall(input: {
  fields: ChainEligibilityAttestationFields;
  signature: `0x${string}`;
}): `0x${string}` {
  return encodeFunctionData({
    abi: ABRAXAS_PARTNER_ELIGIBILITY_CONSUMER_ABI,
    functionName: "recordNamedAction",
    args: [
      {
        schemaVersion: BigInt(input.fields.schemaVersion),
        networkId: input.fields.networkId,
        partnerHash: input.fields.partnerHash,
        policyHash: input.fields.policyHash,
        actionHash: input.fields.actionHash,
        subjectHash: input.fields.subjectHash,
        issuedAt: BigInt(input.fields.issuedAt),
        expiresAt: BigInt(input.fields.expiresAt),
        nonce: input.fields.nonce,
        attestationId: input.fields.attestationId,
        environment: input.fields.environment,
        signerKeyId: input.fields.signerKeyId,
      },
      input.signature,
    ],
  });
}
