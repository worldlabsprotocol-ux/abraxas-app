import { keccak_256 } from "@noble/hashes/sha3";

/** Hash literal bytes without depending on viem's production bundle exports. */
export function keccakHex(bytes: Uint8Array): `0x${string}` {
  const digest = keccak_256(bytes);
  let hex = "0x";
  for (let index = 0; index < digest.length; index += 1) {
    hex += digest[index].toString(16).padStart(2, "0");
  }
  return hex as `0x${string}`;
}

