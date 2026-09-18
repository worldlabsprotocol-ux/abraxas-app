// FILE: lib/partner/launchpad/returnUrl.ts
// Launchpad return URL validation — reuses canonical allowlist semantics.

import { normalizePartnerReturnUrlForAllowlist } from "@/lib/connect/returnUrlAllowlistSemantics";
import { isSafeLaunchpadCallbackHostname } from "./productionCallbackReadiness";

export function validateLaunchpadReturnUrl(returnUrl: string): { ok: true } | { ok: false; code: string } {
  const trimmed = returnUrl.trim();
  if (!trimmed) {
    return { ok: false, code: "return_url_required" };
  }
  if (!normalizePartnerReturnUrlForAllowlist(trimmed)) {
    return { ok: false, code: "return_url_invalid" };
  }
  try {
    const parsed = new URL(trimmed);
    if (!isSafeLaunchpadCallbackHostname(parsed.hostname, parsed.protocol === "http:")) {
      return { ok: false, code: "return_url_unsafe_host" };
    }
  } catch {
    return { ok: false, code: "return_url_invalid" };
  }
  return { ok: true };
}
