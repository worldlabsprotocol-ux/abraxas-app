// FILE: lib/admin/designPartnerApplicationWebsiteDisplay.ts
// Client-safe applicant website display classification — no network/DNS probes.

export const DESIGN_PARTNER_WEBSITE_MAX_LEN = 2048;

export const DESIGN_PARTNER_WEBSITE_SAFE_LINK_LABEL =
  "Open applicant-provided HTTPS website";

export const DESIGN_PARTNER_WEBSITE_INERT_WARNING =
  "Website cannot be opened safely from admin. Review the value manually.";

export type DesignPartnerWebsiteDisplayMode = "missing" | "safe_link" | "inert_unsafe";

export interface DesignPartnerWebsiteDisplay {
  mode: DesignPartnerWebsiteDisplayMode;
  displayText: string;
  href?: string;
  warning?: string;
}

const BLOCKED_HOST_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".home",
  ".lan",
  ".test",
] as const;

const CONTROL_OR_WHITESPACE = /[\s\x00-\x1F\x7F]/;

function stripTrailingDot(hostname: string): string {
  return hostname.replace(/\.+$/, "");
}

function isLocalhostHostname(hostname: string): boolean {
  const host = stripTrailingDot(hostname).toLowerCase();
  if (host === "localhost") return true;
  if (host.endsWith(".localhost")) return true;
  return false;
}

function hasBlockedSpecialUseSuffix(hostname: string): boolean {
  const host = stripTrailingDot(hostname).toLowerCase();
  for (const suffix of BLOCKED_HOST_SUFFIXES) {
    if (host === suffix.slice(1) || host.endsWith(suffix)) {
      return true;
    }
  }
  return false;
}

function isIpv4LiteralHostname(hostname: string): boolean {
  const host = hostname.trim();
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return true;
  if (/^\d+$/.test(host)) return true;
  if (/^0x[0-9a-f]+$/i.test(host)) return true;
  return false;
}

function isIpv6LiteralHostname(hostname: string): boolean {
  return hostname.includes(":");
}

function isIpLiteralHostname(hostname: string): boolean {
  return isIpv4LiteralHostname(hostname) || isIpv6LiteralHostname(hostname);
}

function isSyntacticallyAllowedExternalHostname(hostname: string): boolean {
  if (!hostname) return false;
  if (CONTROL_OR_WHITESPACE.test(hostname)) return false;
  if (isLocalhostHostname(hostname)) return false;
  if (hasBlockedSpecialUseSuffix(hostname)) return false;
  if (isIpLiteralHostname(hostname)) return false;
  return true;
}

function inert(displayText: string): DesignPartnerWebsiteDisplay {
  return {
    mode: "inert_unsafe",
    displayText,
    warning: DESIGN_PARTNER_WEBSITE_INERT_WARNING,
  };
}

export function classifyDesignPartnerWebsiteDisplay(
  raw: string | null | undefined,
): DesignPartnerWebsiteDisplay {
  if (raw === null || raw === undefined) {
    return { mode: "missing", displayText: "—" };
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return { mode: "missing", displayText: "—" };
  }

  if (trimmed.length > DESIGN_PARTNER_WEBSITE_MAX_LEN || CONTROL_OR_WHITESPACE.test(trimmed)) {
    return inert(trimmed);
  }

  if (trimmed.includes("#")) {
    return inert(trimmed);
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    return inert(trimmed);
  }

  if (parsed.protocol !== "https:") {
    return inert(trimmed);
  }

  if (parsed.username || parsed.password) {
    return inert(trimmed);
  }

  if (parsed.hash) {
    return inert(trimmed);
  }

  const hostname = parsed.hostname;
  if (!hostname || !isSyntacticallyAllowedExternalHostname(hostname)) {
    return inert(trimmed);
  }

  const normalized = parsed.toString();
  if (!normalized.startsWith("https://")) {
    return inert(trimmed);
  }

  if (normalized.length > DESIGN_PARTNER_WEBSITE_MAX_LEN) {
    return inert(trimmed);
  }

  return {
    mode: "safe_link",
    displayText: trimmed,
    href: normalized,
  };
}
