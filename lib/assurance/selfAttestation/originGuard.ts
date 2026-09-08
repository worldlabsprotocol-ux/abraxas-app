// FILE: lib/assurance/selfAttestation/originGuard.ts
// CSRF/origin protection for self-attestation API.

import type { NextRequest } from "next/server";
import {
  getEffectiveExternalOriginFromRequest,
  getVercelDeploymentEnv,
  normalizePublicOrigin,
} from "@/lib/app/publicAppOrigin";
import { SITE_URL } from "@/lib/siteUrl";

function resolveAllowedSelfAttestOrigin(req: NextRequest): string {
  const deployment = getVercelDeploymentEnv();

  if (deployment === "production") {
    return normalizePublicOrigin(SITE_URL);
  }

  if (deployment === "preview") {
    return getEffectiveExternalOriginFromRequest(req);
  }

  return getEffectiveExternalOriginFromRequest(req);
}

function logPreviewOriginDiagnostics(input: {
  originHeader: string | null;
  allowed: string;
  exactMatch: boolean;
}): void {
  if (process.env.VERCEL_ENV !== "preview") return;

  let normalizedRequestOrigin: string | null = null;
  if (input.originHeader && input.originHeader !== "null") {
    try {
      normalizedRequestOrigin = normalizePublicOrigin(input.originHeader);
    } catch {
      normalizedRequestOrigin = null;
    }
  }

  console.info(
    JSON.stringify({
      scope: "self_attest_origin_guard",
      vercel_env: process.env.VERCEL_ENV ?? null,
      normalized_request_origin: normalizedRequestOrigin,
      effective_public_origin: input.allowed,
      exact_match: input.exactMatch,
    }),
  );
}

export function assertSelfAttestOrigin(req: NextRequest): { ok: true } | { ok: false; code: string } {
  const originHeader = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const allowed = resolveAllowedSelfAttestOrigin(req);
  const deployment = getVercelDeploymentEnv();

  if (originHeader === "null") {
    logPreviewOriginDiagnostics({ originHeader, allowed, exactMatch: false });
    return { ok: false, code: "origin_not_allowed" };
  }

  if (originHeader) {
    try {
      const normalizedOrigin = normalizePublicOrigin(originHeader);
      const exactMatch = normalizedOrigin === allowed;
      logPreviewOriginDiagnostics({ originHeader, allowed, exactMatch });
      if (exactMatch) {
        return { ok: true };
      }
    } catch {
      logPreviewOriginDiagnostics({ originHeader, allowed, exactMatch: false });
      return { ok: false, code: "origin_not_allowed" };
    }
    logPreviewOriginDiagnostics({ originHeader, allowed, exactMatch: false });
    return { ok: false, code: "origin_not_allowed" };
  }

  if (referer) {
    try {
      const refererOrigin = normalizePublicOrigin(new URL(referer).origin);
      const exactMatch = refererOrigin === allowed;
      logPreviewOriginDiagnostics({ originHeader, allowed, exactMatch });
      if (exactMatch) {
        return { ok: true };
      }
    } catch {
      logPreviewOriginDiagnostics({ originHeader, allowed, exactMatch: false });
      return { ok: false, code: "origin_not_allowed" };
    }
  }

  if (deployment === "development" && process.env.NODE_ENV === "development") {
    return { ok: true };
  }

  logPreviewOriginDiagnostics({ originHeader, allowed, exactMatch: false });
  return { ok: false, code: "origin_required" };
}
