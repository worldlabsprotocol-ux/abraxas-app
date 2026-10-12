import { createHash } from "node:crypto";

/** Anchor 0.30 global instruction discriminator (sha256 prefix). */
export function anchorGlobalDiscriminator(snakeCaseName: string): Buffer {
  return createHash("sha256").update(`global:${snakeCaseName}`).digest().subarray(0, 8);
}

/** Anchor account discriminator for `#[account]` struct name (PascalCase). */
export function anchorAccountDiscriminator(accountStructName: string): Buffer {
  return createHash("sha256").update(`account:${accountStructName}`).digest().subarray(0, 8);
}

export function discriminatorHex(buf: Buffer): string {
  return buf.toString("hex");
}
