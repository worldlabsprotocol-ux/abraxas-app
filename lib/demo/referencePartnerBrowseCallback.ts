// FILE: lib/demo/referencePartnerBrowseCallback.ts
// Abraxas-controlled DEMO reference-partner browse callback — not an external Wix site.

export const REFERENCE_PARTNER_BROWSE_CALLBACK_PATH = "/demo/reference-partner/browse-callback";

/** Build the exact HTTPS callback URL for a given app origin (preview or local). */
export function referencePartnerBrowseCallbackUrl(origin: string): string {
  const base = origin.trim().replace(/\/$/, "");
  return `${base}${REFERENCE_PARTNER_BROWSE_CALLBACK_PATH}`;
}
