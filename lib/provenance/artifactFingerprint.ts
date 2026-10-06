// FILE: lib/provenance/artifactFingerprint.ts
// Privacy-preserving artifact binding — hash only, no raw content retention.

import { createHash } from "crypto";

export const ARTIFACT_CANONICALIZATION_VERSION = "abx-artifact-v1" as const;

export interface ArtifactFingerprintInput {
  content: Buffer | Uint8Array | string;
  contentType: string;
  byteLength?: number;
}

export interface ArtifactFingerprintResult {
  content_hash: string;
  content_type: string;
  byte_length: number;
  canonicalization_version: typeof ARTIFACT_CANONICALIZATION_VERSION;
}

function toBuffer(content: Buffer | Uint8Array | string): Buffer {
  if (typeof content === "string") return Buffer.from(content, "utf8");
  return Buffer.isBuffer(content) ? content : Buffer.from(content);
}

/** Deterministic SHA-256 over raw artifact bytes. No normalization beyond exact bytes. */
export function fingerprintArtifact(input: ArtifactFingerprintInput): ArtifactFingerprintResult {
  const buffer = toBuffer(input.content);
  const byteLength = input.byteLength ?? buffer.length;
  const contentHash = createHash("sha256").update(buffer).digest("hex");

  return {
    content_hash: contentHash,
    content_type: input.contentType.trim().toLowerCase() || "application/octet-stream",
    byte_length: byteLength,
    canonicalization_version: ARTIFACT_CANONICALIZATION_VERSION,
  };
}

export function artifactFingerprintsMatch(
  stored: Pick<ArtifactFingerprintResult, "content_hash">,
  submitted: Pick<ArtifactFingerprintResult, "content_hash">,
): boolean {
  return stored.content_hash === submitted.content_hash;
}

export function buildArtifactEvidenceReference(artifactId: string): string {
  return `abraxas_artifact:${artifactId}`;
}
