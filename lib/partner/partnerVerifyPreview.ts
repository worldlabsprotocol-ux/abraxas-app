// FILE: lib/partner/partnerVerifyPreview.ts
// Server-only gate for local screenshot/preview tooling — never enabled in production.

import "server-only";

import type { PartnerVerifyPhase } from "@/components/partner/PartnerVerifyShell";

const ALLOWED_PREVIEW_PHASES = new Set<PartnerVerifyPhase>([
  "loading",
  "sign_in",
  "signing_in",
  "preparing",
  "verifying",
  "returning",
  "pending_review",
  "denied",
  "error",
  "invalid_link",
  "return_failed",
  "expired",
  "cancelled",
  "invalid_binding",
  "method_not_qualified",
  "provider_unavailable",
  "approved",
]);

export function isPartnerVerifyPreviewControlsEnabled(): boolean {
  return process.env.NODE_ENV !== "production"
    && process.env.PARTNER_VERIFY_PREVIEW_CONTROLS === "1";
}

export function resolvePartnerVerifyPreviewPhase(
  searchParams: Record<string, string | string[] | undefined>,
  enabled: boolean,
): PartnerVerifyPhase | null {
  if (!enabled) return null;
  const raw = searchParams.preview_phase;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !ALLOWED_PREVIEW_PHASES.has(value as PartnerVerifyPhase)) return null;
  return value as PartnerVerifyPhase;
}

export function resolvePartnerVerifyPreviewSignInConfigured(
  searchParams: Record<string, string | string[] | undefined>,
  enabled: boolean,
): boolean {
  if (!enabled) return false;
  const raw = searchParams.preview_signin_configured;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === "1";
}

export function resolvePartnerVerifyPreviewEnvironment(
  searchParams: Record<string, string | string[] | undefined>,
  enabled: boolean,
): string | null {
  if (!enabled) return null;
  const raw = searchParams.preview_environment;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim() || null;
}

export function resolvePartnerVerifyPreviewPartnerName(
  searchParams: Record<string, string | string[] | undefined>,
  enabled: boolean,
): string | null {
  if (!enabled) return null;
  const raw = searchParams.preview_partner_name;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim() || null;
}
