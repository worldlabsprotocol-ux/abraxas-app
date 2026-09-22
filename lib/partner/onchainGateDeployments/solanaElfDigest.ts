import { keccak256 } from "viem";
import { sha256 } from "@noble/hashes/sha256";

/** keccak256 of raw ELF bytes. Same digest `observeSolanaFromAccounts` uses after stripping the upgradeable-loader header. */
export function solanaProgramElfKeccak(elf: Uint8Array): `0x${string}` {
  return keccak256(`0x${Buffer.from(elf).toString("hex")}` as `0x${string}`);
}

export function solanaProgramElfSha256(elf: Uint8Array): `0x${string}` {
  return (`0x${Buffer.from(sha256(elf)).toString("hex")}`) as `0x${string}`;
}
