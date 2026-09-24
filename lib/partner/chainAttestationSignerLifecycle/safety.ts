import { utf8Bytes as stringToBytes } from "@/lib/partner/chainAttestation/utf8";
import { keccakHex } from "./keccak";

export function fingerprintPublicVerifier(value: string): `0x${string}` {
  return keccakHex(stringToBytes(value.trim().toLowerCase()));
}

export function assertNoPrivateAttestationSignerMaterial(payload: unknown): string[] {
  const leaks: string[] = [];
  const blob = JSON.stringify(payload ?? null);
  const lower = blob.toLowerCase();
  for (const needle of [
    "private_key",
    "abraxas_evm_attestation_private_key",
    "abraxas_solana_attestation_private_key",
    "seed phrase",
    "mnemonic",
    '"d"',
    "secretkey",
  ]) {
    if (lower.includes(needle)) leaks.push(needle);
  }
  return leaks;
}

export function rejectAttestationSignerClientOverride(
  source: URLSearchParams | Record<string, unknown> | null | undefined,
  allowed: readonly string[],
): boolean {
  if (!source) return false;
  const keys = source instanceof URLSearchParams
    ? Array.from(source.keys())
    : Object.keys(source);
  return keys.some((key) => !(allowed as readonly string[]).includes(key));
}
