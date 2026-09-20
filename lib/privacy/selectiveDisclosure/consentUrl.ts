// FILE: lib/privacy/selectiveDisclosure/consentUrl.ts
// Holder-visible consent/continue URLs carry only verify_request.

import { getPublicAppOrigin } from "@/lib/app/publicAppOrigin";

export const HOLDER_VISIBLE_QUERY_KEYS = ["verify_request"] as const;

export function buildHolderConsentUrl(input: {
  verifyRequestId: string;
  appOrigin?: string | null;
  path?: "/passport" | "/partner/continue";
}): string {
  const origin = (input.appOrigin ?? getPublicAppOrigin()).replace(/\/$/, "");
  const path = input.path ?? "/passport";
  const params = new URLSearchParams({ verify_request: input.verifyRequestId.trim() });
  return `${origin}${path}?${params.toString()}`;
}

export function holderVisibleSearch(search: string | URLSearchParams): URLSearchParams {
  const params = typeof search === "string" ? new URLSearchParams(search.replace(/^\?/, "")) : new URLSearchParams(search);
  const next = new URLSearchParams();
  const verify = params.get("verify_request")?.trim() ?? "";
  if (verify) next.set("verify_request", verify);
  return next;
}

export function consentUrlContainsOnlyVerifyRequest(url: string): boolean {
  try {
    const parsed = new URL(url, "https://abraxas.example");
    const keys = Array.from(parsed.searchParams.keys());
    return keys.length === 1 && keys[0] === "verify_request" && Boolean(parsed.searchParams.get("verify_request")?.trim());
  } catch {
    return false;
  }
}
