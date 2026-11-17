// FILE: lib/developers/builderPortableReceiptExport.ts
// Client-side portable bundle fetch for sandbox receipts — fail closed with explicit recovery.

export type BuilderPortableExportResult =
  | { ok: true; bundle: unknown; label: "live_sandbox_receipt" }
  | { ok: false; httpStatus: number; error: string; gaps: string[] };

export async function fetchBuilderPortableExport(receiptId: string): Promise<BuilderPortableExportResult> {
  const res = await fetch(`/api/receipts/${encodeURIComponent(receiptId)}/portable-verification`, {
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    bundle?: unknown;
    error?: string;
    gaps?: string[];
  };
  if (res.ok && data.ok === true && data.bundle) {
    return { ok: true, bundle: data.bundle, label: "live_sandbox_receipt" };
  }
  const error = typeof data.error === "string" ? data.error : "portable_verification_fetch_failed";
  const gaps = Array.isArray(data.gaps) ? data.gaps.filter((g): g is string => typeof g === "string") : [];
  return { ok: false, httpStatus: res.status, error, gaps };
}