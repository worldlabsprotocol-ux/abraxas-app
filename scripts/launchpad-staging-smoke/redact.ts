// FILE: scripts/launchpad-staging-smoke/redact.ts
// Redact secrets from logs, reports, and network captures.

const SENSITIVE_HEADER_NAMES = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-admin-pin",
  "x-abraxas-api-key",
]);

const API_KEY_PATTERN = /abx_(?:test|live)_[A-Za-z0-9_-]+/g;
const JWT_PATTERN = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
const SUPABASE_KEY_PATTERN = /sb_(?:publishable|secret)_[A-Za-z0-9_-]+/gi;

export function redactSensitiveText(input: string): string {
  return input
    .replace(API_KEY_PATTERN, "abx_[redacted]")
    .replace(JWT_PATTERN, "[redacted-jwt]")
    .replace(SUPABASE_KEY_PATTERN, "[redacted-supabase-key]")
    .replace(/VERCEL_PROTECTION_BYPASS[=:]\S+/gi, "VERCEL_PROTECTION_BYPASS=[redacted]")
    .replace(/x-vercel-protection-bypass[=:]\S+/gi, "x-vercel-protection-bypass=[redacted]");
}

export function redactHeaders(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (SENSITIVE_HEADER_NAMES.has(key.toLowerCase())) {
      out[key] = "[redacted]";
    } else {
      out[key] = redactSensitiveText(value);
    }
  }
  return out;
}

export function describeApiKey(apiKey: string): { present: true; prefix: string; length: number } {
  const prefixMatch = apiKey.match(/^(abx_(?:test|live)_[A-Za-z0-9_-]{0,12})/);
  return {
    present: true,
    prefix: prefixMatch?.[1] ?? apiKey.slice(0, 12),
    length: apiKey.length,
  };
}

export function assertApiKeyShape(apiKey: string, environment: "sandbox" | "production"): void {
  const expectedPrefix = environment === "production" ? "abx_live_" : "abx_test_";
  if (!apiKey.startsWith(expectedPrefix)) {
    throw new Error(`API key prefix mismatch for ${environment}`);
  }
  if (apiKey.length < 24 || apiKey.length > 128) {
    throw new Error(`API key length out of expected range for ${environment}`);
  }
}
