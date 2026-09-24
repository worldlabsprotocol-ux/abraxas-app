// FILE: lib/partner/chainAttestation/hashes.ts
// keccak256 hashes for chain-portable attestation fields. No PII.

import { concat, keccak256, pad, toBytes, toHex } from "viem";
import { utf8Bytes as stringToBytes } from "./utf8";
import { ZERO_BYTES32, type ChainAttestationEnvironment } from "./contract";

export function hashUtf8(value: string): `0x${string}` {
  return keccak256(stringToBytes(value));
}

export function hashPartnerId(partnerId: string): `0x${string}` {
  return hashUtf8(partnerId.trim().toLowerCase());
}

export function hashNetworkId(networkId: string): `0x${string}` {
  return hashUtf8(networkId.trim());
}

export function hashPolicy(policyId: string, policyVersion: number): `0x${string}` {
  return keccak256(concat([stringToBytes(policyId.trim()), pad(toHex(policyVersion), { size: 32 })]));
}

export function hashAction(actionType: string, actionScope: string): `0x${string}` {
  return keccak256(concat([stringToBytes(actionType), stringToBytes("\0"), stringToBytes(actionScope)]));
}

export function hashEnvironment(environment: ChainAttestationEnvironment): `0x${string}` {
  return hashUtf8(environment);
}

export function hashSignerKeyId(signerKeyId: string): `0x${string}` {
  return hashUtf8(signerKeyId.trim());
}

export function hashSubjectBinding(bindingHash: string | null | undefined): `0x${string}` {
  if (!bindingHash || !bindingHash.trim()) return ZERO_BYTES32;
  const value = bindingHash.trim();
  if (/^0x[0-9a-fA-F]{64}$/.test(value)) return value.toLowerCase() as `0x${string}`;
  return hashUtf8(value);
}

export function randomBytes32(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

export function bytes32FromUuid(id: string): `0x${string}` {
  return keccak256(stringToBytes(id));
}

export function unixSeconds(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 1000);
}

export function encodeU64Be(value: number): Uint8Array {
  const bytes = new Uint8Array(8);
  const big = BigInt(value);
  for (let i = 7; i >= 0; i -= 1) {
    bytes[i] = Number((big >> BigInt((7 - i) * 8)) & BigInt(0xff));
  }
  return bytes;
}

export function encodeU32Be(value: number): Uint8Array {
  return toBytes(value, { size: 4 });
}
