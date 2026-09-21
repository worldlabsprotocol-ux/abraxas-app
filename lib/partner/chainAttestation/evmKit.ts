// FILE: lib/partner/chainAttestation/evmKit.ts
// TypeScript integration kit for the partner-owned EIP-712 verifier. No execution.

import { recoverTypedDataAddress, verifyTypedData } from "viem";
import type { ChainEligibilityAttestationFields, Eip712Domain } from "./contract";
import { ZERO_BYTES32 } from "./contract";
import { eip712TypedData } from "./eip712";
import { assertAttestationBindings } from "./bindings";

export const EVM_VERIFIER_FORBIDDEN_METHODS = [
  "transfer",
  "transferFrom",
  "approve",
  "execute",
  "call",
  "multicall",
] as const;

export async function verifyEvmEligibilityOffchain(input: {
  domain: Eip712Domain;
  fields: ChainEligibilityAttestationFields;
  signature: `0x${string}`;
  trustedSigner: `0x${string}`;
  expected: Parameters<typeof assertAttestationBindings>[0]["expected"];
  nowSeconds: number;
  seenNonces: Set<string>;
}): Promise<{ ok: true; authorized: true } | { ok: false; reason: string }> {
  const bindings = assertAttestationBindings({
    fields: input.fields,
    expected: input.expected,
    nowSeconds: input.nowSeconds,
  });
  if (!bindings.ok) return bindings;
  if (input.domain.partnerHash.toLowerCase() !== input.fields.partnerHash.toLowerCase()) {
    return { ok: false, reason: "invalid" };
  }
  if (input.seenNonces.has(input.fields.nonce.toLowerCase())) {
    return { ok: false, reason: "replayed" };
  }
  const typed = eip712TypedData(input.domain, input.fields);
  const valid = await verifyTypedData({
    address: input.trustedSigner,
    domain: typed.domain,
    types: { ChainEligibilityAttestation: typed.types.ChainEligibilityAttestation },
    primaryType: typed.primaryType,
    message: typed.message,
    signature: input.signature,
  });
  if (!valid) return { ok: false, reason: "unknown_signer" };
  const recovered = await recoverTypedDataAddress({
    domain: typed.domain,
    types: { ChainEligibilityAttestation: typed.types.ChainEligibilityAttestation },
    primaryType: typed.primaryType,
    message: typed.message,
    signature: input.signature,
  });
  if (recovered.toLowerCase() !== input.trustedSigner.toLowerCase()) {
    return { ok: false, reason: "unknown_signer" };
  }
  input.seenNonces.add(input.fields.nonce.toLowerCase());
  return { ok: true, authorized: true };
}

export function requiredSubjectMissing(fields: ChainEligibilityAttestationFields, required: boolean): boolean {
  return required && fields.subjectHash.toLowerCase() === ZERO_BYTES32;
}
