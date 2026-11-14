// Reads a 32-byte Ed25519 seed from a host file. Never commit seed files.

import { readFileSync } from "node:fs";

export function readEd25519SeedFile(path: string): Uint8Array {
  const trimmed = path.trim();
  if (!trimmed) throw new Error("seed_file_path_missing");
  const raw = readFileSync(trimmed, "utf8").trim();
  const decoded = Buffer.from(raw, "base64url");
  if (decoded.length !== 32) throw new Error("seed_file_must_contain_32_byte_base64url_seed");
  return new Uint8Array(decoded);
}