// keccak256 hashes for chain-portable attestation fields. No PII.

import { utf8Bytes } from "./utf8";
import { ZERO_BYTES32, type ChainAttestationEnvironment } from "./contract";
import { keccakHex } from "@/lib/partner/chainAttestationSignerLifecycle/keccak";

function join(parts: Uint8Array[]): Uint8Array {
  const output = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) { output.set(part, offset); offset += part.length; }
  return output;
}

function legacyPolicyVersionBytes(value: number): Uint8Array {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("invalid_policy_version");
  // Preserve the released policy hash: viem concat([Uint8Array, paddedHex])
  // treated the 66-character hex string as an array of numeric characters.
  // Changing this encoding would invalidate existing on-chain GateConfigs.
  const paddedHex = `0x${value.toString(16).padStart(64, "0")}`;
  return Uint8Array.from(paddedHex, (character) => Number(character) || 0);
}

export function hashUtf8(value: string): `0x${string}` {
  return keccakHex(utf8Bytes(value));
}

export function hashPartnerId(partnerId: string): `0x${string}` {
  return hashUtf8(partnerId.trim().toLowerCase());
}

export function hashNetworkId(networkId: string): `0x${string}` {
  return hashUtf8(networkId.trim());
}

export function hashPolicy(policyId: string, policyVersion: number): `0x${string}` {
  return keccakHex(join([utf8Bytes(policyId.trim()), legacyPolicyVersionBytes(policyVersion)]));
}

export function hashAction(actionType: string, actionScope: string): `0x${string}` {
  return keccakHex(join([utf8Bytes(actionType), new Uint8Array([0]), utf8Bytes(actionScope)]));
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
  return `0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

export function bytes32FromUuid(id: string): `0x${string}` {
  return keccakHex(utf8Bytes(id));
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
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffffff) throw new Error("invalid_uint32");
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, false);
  return bytes;
}

