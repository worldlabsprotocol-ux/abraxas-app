// FILE: lib/idv/passportDocumentStoragePath.ts
// Opaque passport-documents storage paths — no email, wallet, or subject identifiers in NEW uploads.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_LIKE_RE = /@/;
const SUI_ADDRESS_RE = /0x[a-f0-9]{8,}/i;
const EMAIL_SAFE_SEGMENT_RE = /[a-z0-9]+_[a-z0-9]+_(com|org|net|edu|gov|io|co|uk|de|fr)/i;

export type PassportCaptureDocumentType = "id_front" | "selfie";

function extensionForContentType(contentType: string): "png" | "jpg" {
  return contentType.includes("png") ? "png" : "jpg";
}

function sanitizeFileName(fileName: string): string {
  const base = fileName.split(/[/\\]/).pop() ?? "upload.bin";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return cleaned.length > 0 ? cleaned : "upload.bin";
}

export function assertOpaqueSessionId(sessionId: string): void {
  if (!UUID_RE.test(sessionId)) {
    throw new Error("invalid_opaque_session_id");
  }
}

/** NEW identity capture uploads — opaque session UUID only. */
export function buildOpaqueCaptureStoragePath(input: {
  captureSessionId: string;
  documentType: PassportCaptureDocumentType;
  contentType: string;
}): string {
  assertOpaqueSessionId(input.captureSessionId);
  const ext = extensionForContentType(input.contentType);
  return `identity/v2/${input.captureSessionId}/${input.documentType}.${ext}`;
}

/** NEW stamp uploads (including identity stamp) — opaque upload session UUID. */
export function buildOpaqueStampUploadPath(input: {
  stampId: string;
  uploadSessionId: string;
  originalFileName: string;
}): string {
  assertOpaqueSessionId(input.uploadSessionId);
  const safeStamp = input.stampId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
  const safeName = sanitizeFileName(input.originalFileName);
  return `${safeStamp}/v2/${input.uploadSessionId}/${safeName}`;
}

/** Returns false when path embeds email-like strings, wallet addresses, or legacy email-safe folders. */
export function opaqueStoragePathHasNoPii(path: string, forbiddenSegments: string[] = []): boolean {
  if (!path || path.includes("..")) return false;
  if (EMAIL_LIKE_RE.test(path)) return false;
  if (SUI_ADDRESS_RE.test(path)) return false;
  if (EMAIL_SAFE_SEGMENT_RE.test(path)) return false;

  const lower = path.toLowerCase();
  for (const segment of forbiddenSegments) {
    const normalized = segment.trim().toLowerCase();
    if (!normalized) continue;
    if (lower.includes(normalized)) return false;
    const emailSafe = normalized.replace(/[^a-z0-9]/gi, "_");
    if (emailSafe.length >= 3 && lower.includes(emailSafe.toLowerCase())) return false;
  }

  // Legacy email-based identity paths — allowed for reads, forbidden for NEW writes.
  if (/^identity\/[^/v][^/]*\//i.test(path) && !path.startsWith("identity/v2/")) {
    return false;
  }

  return true;
}

export function isLegacyPassportDocumentPath(path: string): boolean {
  if (path.startsWith("identity/v2/")) return false;
  if (/^identity\/[^/]+\/[^/]+\/(id_front|selfie)\.[a-z]+$/i.test(path)) return true;
  if (/^[^/]+\/[^/]+\/\d+_/.test(path)) return true;
  return false;
}
