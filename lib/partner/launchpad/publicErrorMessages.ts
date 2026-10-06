// FILE: lib/partner/launchpad/publicErrorMessages.ts
// Human-readable Launchpad public errors — stable codes, safe copy.

import { LAUNCHPAD_PUBLIC_ERRORS } from "./publicErrors";

export interface LaunchpadPublicErrorContext {
  retryAfterSec?: number;
}

function rateLimitMessage(ctx?: LaunchpadPublicErrorContext): string {
  const base = "Too many sandbox requests were created recently. Wait a little and try again.";
  const retry = ctx?.retryAfterSec;
  if (typeof retry === "number" && retry > 0) {
    return `${base} You can retry in about ${retry} seconds.`;
  }
  return base;
}

const PUBLIC_ERROR_MESSAGES: Record<string, (ctx?: LaunchpadPublicErrorContext) => string> = {
  launchpad_rate_limited: rateLimitMessage,
  [LAUNCHPAD_PUBLIC_ERRORS.sandbox_rate_limited]: rateLimitMessage,
};

export function formatLaunchpadPublicError(
  code: string | undefined,
  fallback?: string,
  ctx?: LaunchpadPublicErrorContext,
): string {
  if (fallback && fallback !== code) return fallback;
  if (!code) return fallback ?? "Something went wrong. Try again.";
  const formatter = PUBLIC_ERROR_MESSAGES[code];
  if (formatter) return formatter(ctx);
  if (/^[a-z0-9_]+$/.test(code) && code.includes("_")) {
    return "Something went wrong. Try again.";
  }
  return fallback ?? code;
}

export function launchpadErrorFromResponse(
  data: { code?: string; error?: string; retry_after_sec?: number },
  fallback = "Something went wrong. Try again.",
): string {
  return formatLaunchpadPublicError(data.code, data.error ?? fallback, {
    retryAfterSec: data.retry_after_sec,
  });
}

export function launchpadPublicErrorBody(
  code: string,
  ctx?: LaunchpadPublicErrorContext,
  messageOverride?: string,
): { ok: false; code: string; error: string; retry_after_sec?: number } {
  const body: { ok: false; code: string; error: string; retry_after_sec?: number } = {
    ok: false,
    code,
    error: messageOverride ?? formatLaunchpadPublicError(code, undefined, ctx),
  };
  if (typeof ctx?.retryAfterSec === "number" && ctx.retryAfterSec > 0) {
    body.retry_after_sec = ctx.retryAfterSec;
  }
  return body;
}
