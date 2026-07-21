// FILE: lib/authenticationProof/canonical.ts

import { createHash } from "crypto";
import type { AuthenticationProofPayload } from "./types";

export function canonicalizeAuthProof(payload: AuthenticationProofPayload): string {
  return JSON.stringify(payload, Object.keys(payload).sort());
}

export function hashAuthProofPayload(payload: AuthenticationProofPayload): string {
  return createHash("sha256").update(canonicalizeAuthProof(payload), "utf8").digest("hex");
}
