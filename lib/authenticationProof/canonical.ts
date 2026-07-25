// FILE: lib/authenticationProof/canonical.ts

import { createHash } from "crypto";
import type { AuthenticationProofPayload } from "./types";

/** Postgres TIMESTAMPTZ returns +00:00; signing uses Z — normalize before verify. */
export function normalizeIsoTimestamp(value: string): string {
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return value;
  return new Date(ms).toISOString();
}

export function canonicalizeAuthProof(payload: AuthenticationProofPayload): string {
  return JSON.stringify(payload, Object.keys(payload).sort());
}

export function hashAuthProofPayload(payload: AuthenticationProofPayload): string {
  return createHash("sha256").update(canonicalizeAuthProof(payload), "utf8").digest("hex");
}
