/** Encode literal UTF-8 bytes, including strings that happen to begin with 0x. */
export function utf8Bytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}
