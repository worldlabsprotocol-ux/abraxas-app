import { sha256 } from "@noble/hashes/sha256";
import { keccakHex } from "@/lib/partner/chainAttestationSignerLifecycle/keccak";

/** keccak256 of raw ELF bytes after stripping the upgradeable-loader header. */
export function solanaProgramElfKeccak(elf: Uint8Array): `0x${string}` {
  return keccakHex(elf);
}

export function solanaProgramElfSha256(elf: Uint8Array): `0x${string}` {
  return (`0x${Buffer.from(sha256(elf)).toString("hex")}`) as `0x${string}`;
}

