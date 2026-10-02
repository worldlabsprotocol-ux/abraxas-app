// FILE: lib/demo/referenceContentPublisher/articleFingerprint.ts
// Canonical article bytes for fingerprint binding — hash-only, no raw persistence.

import { fingerprintArtifact } from "@/lib/provenance/artifactFingerprint";

export function canonicalizeArticleDraft(input: { title: string; body: string }): string {
  const title = input.title.trim();
  const body = input.body.trim();
  return `${title}\n\n${body}`;
}

export function fingerprintArticleDraft(input: { title: string; body: string }) {
  const canonical = canonicalizeArticleDraft(input);
  return fingerprintArtifact({
    content: canonical,
    contentType: "text/plain; charset=utf-8",
  });
}

export function articleDraftToDownloadBlob(input: { title: string; body: string }): Blob {
  const canonical = canonicalizeArticleDraft(input);
  return new Blob([canonical], { type: "text/plain;charset=utf-8" });
}
