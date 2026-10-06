// FILE: lib/provenance/clientArtifactFingerprint.ts
// Browser-side SHA-256 fingerprinting — bytes never leave the device as raw upload.

export async function fingerprintArtifactInBrowser(file: File): Promise<{
  content_hash: string;
  content_type: string;
  byte_length: number;
}> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(digest));
  const content_hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return {
    content_hash,
    content_type: file.type || "application/octet-stream",
    byte_length: file.size,
  };
}
