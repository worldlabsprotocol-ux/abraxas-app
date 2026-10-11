// Canonical scoped replay key material — HMAC only, no raw evidence in storage keys.

import { createHmac } from "node:crypto";
import { InstitutionalReplayStoreUnavailableError } from "@/lib/institutional/errors";

const NONCE_MIN = 16;
const NONCE_MAX = 128;
const ACTION_SCOPE_MAX = 256;

function hmacKey(): string {
  const key = process.env.NEXTAUTH_SECRET?.trim() ?? "";
  if (!key) throw new InstitutionalReplayStoreUnavailableError("hash_key_unavailable");
  return key;
}

function keyed(parts: string[]): string {
  const hmac = createHmac("sha256", hmacKey());
  for (const part of parts) hmac.update(part).update("\0");
  return hmac.digest("hex");
}

export function normalizeInstitutionalReplayNonce(raw: string): string | null {
  const nonce = raw.trim();
  if (nonce.length < NONCE_MIN || nonce.length > NONCE_MAX) return null;
  if (!/^[A-Za-z0-9._-]+$/.test(nonce)) return null;
  return nonce;
}

export function normalizeActionScope(raw: string | null | undefined): string {
  const value = (raw ?? "").trim().slice(0, ACTION_SCOPE_MAX);
  return value;
}

export function institutionalSubjectScopeHash(subjectPseudonymId: string): string {
  return keyed(["subject_scope", subjectPseudonymId.trim()]);
}

export function institutionalReplayNonceHash(input: {
  partnerId: string;
  applicationId: string | null;
  receiptId: string;
  subjectScopeHash: string;
  policyId: string;
  policyVersion: number;
  actionScopeNorm: string;
  nonce: string;
}): string {
  return keyed([
    "institutional_replay",
    input.partnerId.trim().toLowerCase(),
    (input.applicationId ?? "").trim(),
    input.receiptId.trim(),
    input.subjectScopeHash,
    input.policyId.trim(),
    String(input.policyVersion),
    input.actionScopeNorm,
    input.nonce,
  ]);
}

/** Default TTL for consume nonces — independent authorized actions require fresh nonces. */
export function institutionalReplayNonceExpiresAt(now = new Date()): string {
  const ttlMs = 15 * 60 * 1000;
  return new Date(now.getTime() + ttlMs).toISOString();
}
