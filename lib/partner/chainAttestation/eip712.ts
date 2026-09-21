// FILE: lib/partner/chainAttestation/eip712.ts
// EIP-712 typed-data construction. Domain-separated. No execution payload.

import { hashTypedData, type TypedDataDefinition } from "viem";
import {
  CHAIN_ATTESTATION_SCHEMA_VERSION,
  EIP712_ATTESTATION_TYPE,
  EIP712_DOMAIN_NAME,
  EIP712_DOMAIN_TYPE,
  EIP712_DOMAIN_VERSION,
  EIP712_PRIMARY_TYPE,
  type ChainEligibilityAttestationFields,
  type Eip712Domain,
} from "./contract";

export function eip712Domain(input: {
  chainId: number;
  verifyingContract: `0x${string}`;
  partnerHash: `0x${string}`;
}): Eip712Domain {
  return {
    name: EIP712_DOMAIN_NAME,
    version: EIP712_DOMAIN_VERSION,
    chainId: input.chainId,
    verifyingContract: input.verifyingContract,
    partnerHash: input.partnerHash,
  };
}

export function eip712TypedData(domain: Eip712Domain, message: ChainEligibilityAttestationFields) {
  return {
    domain,
    types: {
      EIP712Domain: [...EIP712_DOMAIN_TYPE],
      ChainEligibilityAttestation: [...EIP712_ATTESTATION_TYPE],
    },
    primaryType: EIP712_PRIMARY_TYPE,
    message: {
      schemaVersion: BigInt(message.schemaVersion),
      networkId: message.networkId,
      partnerHash: message.partnerHash,
      policyHash: message.policyHash,
      actionHash: message.actionHash,
      subjectHash: message.subjectHash,
      issuedAt: BigInt(message.issuedAt),
      expiresAt: BigInt(message.expiresAt),
      nonce: message.nonce,
      attestationId: message.attestationId,
      environment: message.environment,
      signerKeyId: message.signerKeyId,
      organizationCommitment: message.organizationCommitment,
      actorCommitment: message.actorCommitment,
      institutionalResultCategory: message.institutionalResultCategory,
    },
  } as const;
}

export function hashChainAttestationTypedData(
  domain: Eip712Domain,
  message: ChainEligibilityAttestationFields,
): `0x${string}` {
  const typed = eip712TypedData(domain, message);
  return hashTypedData(typed as unknown as TypedDataDefinition);
}

export function schemaMatchesDomain(domain: Eip712Domain): boolean {
  return domain.name === EIP712_DOMAIN_NAME
    && domain.version === EIP712_DOMAIN_VERSION
    && domain.version === String(CHAIN_ATTESTATION_SCHEMA_VERSION);
}
