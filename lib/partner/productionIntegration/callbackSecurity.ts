// FILE: lib/partner/productionIntegration/callbackSecurity.ts
// Production-safe callback registration and runtime validation. Fail closed.

import {
  isPartnerReturnUrlAllowlisted,
  normalizePartnerReturnUrlForAllowlist,
} from "@/lib/connect/returnUrlAllowlistSemantics";
import { isLaunchpadReturnUrlAllowlisted } from "@/lib/partner/launchpad/launchpadReturnUrlAllowlist";
import {
  hasProductionLaunchpadCallback,
  isProductionLaunchpadCallback,
  isSafeLaunchpadCallbackHostname,
} from "@/lib/partner/launchpad/productionCallbackReadiness";
import { validateLaunchpadReturnUrl } from "@/lib/partner/launchpad/returnUrl";

export type CallbackEnvironment = "sandbox" | "production" | "development";

export type CallbackSecurityFailure =
  | "callback_unregistered"
  | "callback_wrong_partner"
  | "callback_wrong_application"
  | "callback_wrong_environment"
  | "callback_http_in_production"
  | "callback_return_url_altered"
  | "callback_invalid"
  | "callback_open_redirect";

export interface CallbackSecurityInput {
  returnUrl: string;
  allowedUrls: string[];
  environment: CallbackEnvironment;
  partnerId: string;
  applicationPartnerId?: string;
  registeredCallbackUrl?: string | null;
  strictLaunchpad?: boolean;
}

export interface CallbackSecurityResult {
  ok: boolean;
  errors: CallbackSecurityFailure[];
  normalized: string | null;
  productionReady: boolean;
}

function isLocalhostCallback(returnUrl: string): boolean {
  try {
    const parsed = new URL(returnUrl);
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export function assessCallbackForEnvironment(returnUrl: string, environment: CallbackEnvironment): CallbackSecurityFailure[] {
  const errors: CallbackSecurityFailure[] = [];
  const normalized = normalizePartnerReturnUrlForAllowlist(returnUrl);
  if (!normalized) {
    errors.push("callback_invalid");
    return errors;
  }

  try {
    const parsed = new URL(normalized);
    const isLocal = isLocalhostCallback(normalized);
    if (environment === "production") {
      if (parsed.protocol !== "https:") errors.push("callback_http_in_production");
      if (isLocal) errors.push("callback_wrong_environment");
      if (!isSafeLaunchpadCallbackHostname(parsed.hostname)) errors.push("callback_invalid");
    } else if (environment === "sandbox" && parsed.protocol === "http:" && !isLocal) {
      errors.push("callback_wrong_environment");
    }
  } catch {
    errors.push("callback_invalid");
  }

  return errors;
}

export function validateRegisteredCallback(input: CallbackSecurityInput): CallbackSecurityResult {
  const errors: CallbackSecurityFailure[] = [];
  const trimmed = input.returnUrl.trim();
  const normalized = normalizePartnerReturnUrlForAllowlist(trimmed);

  if (!normalized) {
    return { ok: false, errors: ["callback_invalid"], normalized: null, productionReady: false };
  }

  if (input.applicationPartnerId && input.applicationPartnerId !== input.partnerId) {
    errors.push("callback_wrong_partner");
  }

  const allowlisted = input.strictLaunchpad
    ? isLaunchpadReturnUrlAllowlisted(input.allowedUrls, trimmed)
    : isPartnerReturnUrlAllowlisted(input.allowedUrls, trimmed);

  if (!allowlisted) {
    errors.push("callback_unregistered");
  }

  if (input.registeredCallbackUrl) {
    const registeredNorm = normalizePartnerReturnUrlForAllowlist(input.registeredCallbackUrl);
    if (registeredNorm && normalized !== registeredNorm && !normalized.startsWith(`${registeredNorm}/`)) {
      const matchesAllowlist = input.strictLaunchpad
        ? isLaunchpadReturnUrlAllowlisted(input.allowedUrls, input.registeredCallbackUrl)
        : isPartnerReturnUrlAllowlisted(input.allowedUrls, input.registeredCallbackUrl);
      if (matchesAllowlist && normalized !== registeredNorm) {
        errors.push("callback_return_url_altered");
      }
    }
  }

  errors.push(...assessCallbackForEnvironment(trimmed, input.environment));

  const registrationCheck = validateLaunchpadReturnUrl(trimmed);
  if (!registrationCheck.ok && !errors.includes("callback_invalid")) {
    errors.push("callback_invalid");
  }

  const productionReady = hasProductionLaunchpadCallback(input.allowedUrls)
    && isProductionLaunchpadCallback(trimmed);

  return {
    ok: errors.length === 0,
    errors: Array.from(new Set(errors)),
    normalized,
    productionReady,
  };
}

export function rejectHolderSuppliedReturnUrl(input: {
  serverReturnUrl: string;
  holderReturnUrl?: string | null;
}): CallbackSecurityFailure | null {
  if (!input.holderReturnUrl?.trim()) return null;
  const server = normalizePartnerReturnUrlForAllowlist(input.serverReturnUrl);
  const holder = normalizePartnerReturnUrlForAllowlist(input.holderReturnUrl);
  if (!server || !holder) return "callback_open_redirect";
  if (server !== holder && !holder.startsWith(`${server}/`)) return "callback_return_url_altered";
  return null;
}
