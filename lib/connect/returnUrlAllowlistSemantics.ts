// FILE: lib/connect/returnUrlAllowlistSemantics.ts
// Canonical pure return-URL normalization and allowlist matching for Partner Flow callbacks.

export interface ReturnUrlAllowlistFixtureCase {
  id: string;
  allowedUrls: string[];
  returnUrl: string;
  expected: boolean;
}

/** Shared fixture matrix — TS semantics and migration SQL helpers must agree. */
export const RETURN_URL_ALLOWLIST_FIXTURE_MATRIX: ReturnUrlAllowlistFixtureCase[] = [
  {
    id: "exact_https_match",
    allowedUrls: ["https://app.example.com/callback"],
    returnUrl: "https://app.example.com/callback",
    expected: true,
  },
  {
    id: "trailing_slash_on_return",
    allowedUrls: ["https://app.example.com/callback"],
    returnUrl: "https://app.example.com/callback/",
    expected: true,
  },
  {
    id: "trailing_slash_on_entry",
    allowedUrls: ["https://app.example.com/callback/"],
    returnUrl: "https://app.example.com/callback",
    expected: true,
  },
  {
    id: "prefix_path_match",
    allowedUrls: ["https://app.example.com/callback"],
    returnUrl: "https://app.example.com/callback/complete",
    expected: true,
  },
  {
    id: "query_and_fragment_ignored",
    allowedUrls: ["https://app.example.com/callback"],
    returnUrl: "https://app.example.com/callback?state=1#frag",
    expected: true,
  },
  {
    id: "http_localhost_allowed",
    allowedUrls: ["http://localhost:3000/callback"],
    returnUrl: "http://localhost:3000/callback",
    expected: true,
  },
  {
    id: "http_non_localhost_rejected",
    allowedUrls: ["http://app.example.com/callback"],
    returnUrl: "http://app.example.com/callback",
    expected: false,
  },
  {
    id: "unlisted_host_rejected",
    allowedUrls: ["https://app.example.com/callback"],
    returnUrl: "https://evil.example.com/callback",
    expected: false,
  },
  {
    id: "invalid_return_url",
    allowedUrls: ["https://app.example.com/callback"],
    returnUrl: "not-a-url",
    expected: false,
  },
  {
    id: "invalid_allowlist_entry_skipped",
    allowedUrls: ["not-a-url", "https://app.example.com/callback"],
    returnUrl: "https://app.example.com/callback",
    expected: true,
  },
  {
    id: "origin_only_path",
    allowedUrls: ["https://app.example.com/"],
    returnUrl: "https://app.example.com",
    expected: true,
  },
];

export function normalizePartnerReturnUrlForAllowlist(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  if (parsed.protocol === "http:" && parsed.hostname !== "localhost") return null;

  return `${parsed.origin}${parsed.pathname}`.replace(/\/$/, "");
}

export function partnerReturnUrlMatchesAllowlistEntry(
  normalizedReturnUrl: string,
  allowlistEntry: string,
): boolean {
  const candidate = normalizePartnerReturnUrlForAllowlist(allowlistEntry);
  if (!candidate) return false;
  return (
    normalizedReturnUrl === candidate
    || normalizedReturnUrl.startsWith(`${candidate}/`)
  );
}

export function isPartnerReturnUrlAllowlisted(
  allowedUrls: string[] | null | undefined,
  returnUrl: string,
): boolean {
  if (!allowedUrls?.length) return false;

  const normalized = normalizePartnerReturnUrlForAllowlist(returnUrl);
  if (!normalized) return false;

  return allowedUrls.some((entry) => partnerReturnUrlMatchesAllowlistEntry(normalized, entry));
}
