// FILE: lib/idv/documentApiPublicErrors.ts
// Stable public reason codes for identity document API routes.

export const DOCUMENT_CAPTURE_PERSISTENCE_FAILED = "document_capture_persistence_failed";
export const DOCUMENT_UPLOAD_FAILED = "document_upload_failed";
export const DOCUMENT_METADATA_PERSISTENCE_FAILED = "document_metadata_persistence_failed";

const SENSITIVE_PATTERNS = [
  /supabase/i,
  /postgres/i,
  /sqlstate/i,
  /passport[-_]documents/i,
  /storage/i,
  /bucket/i,
  /identity_review_sessions/i,
  /https?:\/\//i,
  /relation\s+"[^"]+"/i,
  /duplicate key/i,
];

export function isSensitiveErrorDetail(value: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(value));
}

export function logDocumentApiError(
  context: string,
  err: unknown,
  meta?: Record<string, string | number | boolean | null | undefined>,
): void {
  const message = err instanceof Error ? err.message : String(err);
  const code = err && typeof err === "object" && "code" in err
    ? String((err as { code?: unknown }).code ?? "")
    : undefined;
  console.error(`[${context}]`, {
    ...meta,
    error_message: message,
    error_code: code,
  });
}
