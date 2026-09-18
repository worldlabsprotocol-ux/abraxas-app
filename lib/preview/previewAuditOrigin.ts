// FILE: lib/preview/previewAuditOrigin.ts
// Preview audit must stay on the PR Preview origin — never Production.

import { SITE_URL } from "@/lib/siteUrl";

/** Production browser origins — register and audit must not run here during Preview walks. */
export const PREVIEW_AUDIT_FORBIDDEN_ORIGINS = Object.freeze([
  SITE_URL,
  "https://abraxas-app.vercel.app",
] as const);

export function originFromUrl(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function expectedPreviewOrigin(previewUrl: string): string {
  return new URL(previewUrl.replace(/\/$/, "")).origin;
}

export function isForbiddenProductionAuditOrigin(origin: string): boolean {
  const normalized = origin.replace(/\/$/, "").toLowerCase();
  return PREVIEW_AUDIT_FORBIDDEN_ORIGINS.some(
    (forbidden) => forbidden.toLowerCase() === normalized,
  );
}

export function isAllowedHandoffOrigin(url: string, previewUrl: string): boolean {
  const origin = originFromUrl(url);
  if (!origin) return false;
  if (isForbiddenProductionAuditOrigin(origin)) return false;
  if (origin === expectedPreviewOrigin(previewUrl)) return true;
  if (origin.includes("accounts.google.com")) return true;
  if (origin.includes("vercel.com")) return true;
  return false;
}

export class PreviewAuditOriginViolation extends Error {
  readonly observedOrigin: string;
  readonly expectedPreviewOrigin: string;
  readonly context: string;

  constructor(observedUrl: string, previewUrl: string, context: string) {
    const observedOrigin = originFromUrl(observedUrl) ?? observedUrl;
    const expected = expectedPreviewOrigin(previewUrl);
    super(
      `Preview audit left controlled Preview origin during ${context}: `
      + `observed=${observedOrigin}; expected=${expected} (or accounts.google.com / vercel.com)`,
    );
    this.name = "PreviewAuditOriginViolation";
    this.observedOrigin = observedOrigin;
    this.expectedPreviewOrigin = expected;
    this.context = context;
  }
}

export function assertPreviewAuditOrigin(
  url: string,
  previewUrl: string,
  context: string,
): void {
  if (isAllowedHandoffOrigin(url, previewUrl)) return;
  throw new PreviewAuditOriginViolation(url, previewUrl, context);
}

export function redactOAuthUrlForTrace(url: string): string {
  try {
    const parsed = new URL(url);
    for (const key of ["nonce", "state", "code", "id_token", "access_token", "authError", "aes"]) {
      if (parsed.searchParams.has(key)) parsed.searchParams.set(key, "[REDACTED]");
    }
    if (parsed.hash) {
      const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ""));
      for (const key of ["id_token", "access_token", "state", "nonce"]) {
        if (hashParams.has(key)) hashParams.set(key, "[REDACTED]");
      }
      parsed.hash = hashParams.toString() ? `#${hashParams.toString()}` : "";
    }
    return parsed.toString();
  } catch {
    return url.split("?")[0];
  }
}

export function extractRedirectUriFromGoogleOAuthUrl(url: string): string | null {
  try {
    return new URL(url).searchParams.get("redirect_uri");
  } catch {
    return null;
  }
}
