// FILE: lib/settlement/signing.ts
// EIP-712 settlement authorization signing — domain separated from receipt Ed25519 keys.

import "server-only";

import { randomBytes } from "crypto";
import {
  type Hex,
  type TypedDataDomain,
  encodeAbiParameters,
  keccak256,
} from "viem";
import {
  loadSettlementSignerPrivateKey,
  deriveSettlementSignerAddress,
  validateSettlementSignerConfiguration,
} from "@/lib/settlement/settlementSigner.server";
import type { SettlementAmountKind, SettlementAuthorizationPayload, SettlementEnvironment } from "@/lib/settlement/types";
import {
  SETTLEMENT_EIP712_DOMAIN_NAME,
  SETTLEMENT_EIP712_DOMAIN_VERSION,
} from "@/lib/settlement/constants";

export const SETTLEMENT_TYPED_DATA_TYPES = {
  SettlementAuthorization: [
    { name: "chainId", type: "uint256" },
    { name: "environment", type: "uint8" },
    { name: "partnerApplicationId", type: "bytes32" },
    { name: "partnerIdHash", type: "bytes32" },
    { name: "policyIdHash", type: "bytes32" },
    { name: "policyVersion", type: "uint256" },
    { name: "eligibleWallet", type: "address" },
    { name: "recipient", type: "address" },
    { name: "token", type: "address" },
    { name: "amountMicroUsdc", type: "uint256" },
    { name: "amountKind", type: "uint8" },
    { name: "actionType", type: "bytes32" },
    { name: "nonce", type: "bytes32" },
    { name: "issuedAt", type: "uint256" },
    { name: "expiresAt", type: "uint256" },
    { name: "receiptCommitment", type: "bytes32" },
    { name: "settlementReference", type: "bytes32" },
  ],
} as const;

export function environmentToUint8(environment: SettlementEnvironment): number {
  return environment === "sandbox" ? 0 : 1;
}

export function amountKindToUint8(kind: SettlementAmountKind): number {
  return kind === "exact" ? 0 : 1;
}

export function generateSettlementNonce(): `0x${string}` {
  return `0x${randomBytes(32).toString("hex")}` as `0x${string}`;
}

export function getSettlementSignerAddress(): `0x${string}` | null {
  const configured = process.env.ABRAXAS_SETTLEMENT_SIGNER_ADDRESS?.trim().toLowerCase();
  if (configured) return configured as `0x${string}`;
  return deriveSettlementSignerAddress();
}

export { loadSettlementSignerPrivateKey, validateSettlementSignerConfiguration };

export function buildSettlementTypedDataDomain(
  chainId: number,
  verifyingContract: `0x${string}`,
): TypedDataDomain {
  return {
    name: SETTLEMENT_EIP712_DOMAIN_NAME,
    version: SETTLEMENT_EIP712_DOMAIN_VERSION,
    chainId: BigInt(chainId),
    verifyingContract,
  };
}

export function buildSettlementTypedDataMessage(payload: SettlementAuthorizationPayload) {
  return {
    chainId: payload.chainId,
    environment: environmentToUint8(payload.environment as SettlementEnvironment),
    partnerApplicationId: payload.partnerApplicationId,
    partnerIdHash: payload.partnerIdHash,
    policyIdHash: payload.policyIdHash,
    policyVersion: payload.policyVersion,
    eligibleWallet: payload.eligibleWallet,
    recipient: payload.recipient,
    token: payload.token,
    amountMicroUsdc: payload.amountMicroUsdc,
    amountKind: amountKindToUint8(payload.amountKind),
    actionType: payload.actionType,
    nonce: payload.nonce,
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt,
    receiptCommitment: payload.receiptCommitment,
    settlementReference: payload.settlementReference,
  };
}

export async function signSettlementAuthorization(
  payload: SettlementAuthorizationPayload,
  verifyingContract: `0x${string}`,
): Promise<{ signature: `0x${string}`; signerAddress: `0x${string}` }> {
  const signer = validateSettlementSignerConfiguration();
  if (!signer.ok) {
    throw new Error(signer.code);
  }
  const account = signer.account;
  const domain = buildSettlementTypedDataDomain(Number(payload.chainId), verifyingContract);
  const message = buildSettlementTypedDataMessage(payload);
  const signature = await account.signTypedData({
    domain,
    types: SETTLEMENT_TYPED_DATA_TYPES,
    primaryType: "SettlementAuthorization",
    message,
  });
  return {
    signature,
    signerAddress: account.address.toLowerCase() as `0x${string}`,
  };
}

/** ABI encode authorization for contract verification parity tests */
export function hashSettlementAuthorizationStruct(payload: SettlementAuthorizationPayload): `0x${string}` {
  const encoded = encodeAbiParameters(
    [
      { type: "uint256" },
      { type: "uint8" },
      { type: "bytes32" },
      { type: "bytes32" },
      { type: "bytes32" },
      { type: "uint256" },
      { type: "address" },
      { type: "address" },
      { type: "address" },
      { type: "uint256" },
      { type: "uint8" },
      { type: "bytes32" },
      { type: "bytes32" },
      { type: "uint256" },
      { type: "uint256" },
      { type: "bytes32" },
      { type: "bytes32" },
    ],
    [
      payload.chainId,
      environmentToUint8(payload.environment as SettlementEnvironment),
      payload.partnerApplicationId,
      payload.partnerIdHash,
      payload.policyIdHash,
      payload.policyVersion,
      payload.eligibleWallet,
      payload.recipient,
      payload.token,
      payload.amountMicroUsdc,
      amountKindToUint8(payload.amountKind),
      payload.actionType,
      payload.nonce,
      payload.issuedAt,
      payload.expiresAt,
      payload.receiptCommitment,
      payload.settlementReference,
    ],
  );
  return keccak256(encoded);
}
