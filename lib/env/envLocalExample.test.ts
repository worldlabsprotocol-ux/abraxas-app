import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const EXAMPLE_PATH = join(ROOT, ".env.local.example");
const CI_PATH = join(ROOT, ".github/workflows/ci.yml");

const STALE_HOST = "abraxas-app.vercel.app";
const LOCAL_ORIGIN = "http://localhost:3000";
const CI_SUPABASE_PLACEHOLDER_URL = "https://placeholder.supabase.co";

const REQUIRED_DOCUMENTED_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_APP_URL",
  "ABRAXAS_ISSUER_URL",
  "ABRAXAS_SIGNING_KEY",
  "ABRAXAS_PUBLIC_KEY",
  "ABRAXAS_ADMIN_EMAILS",
  "NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID",
  "GOOGLE_ZKLOGIN_CLIENT_ID",
] as const;

const SUPABASE_URL_KEYS = new Set([
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_URL",
]);

const JWT_LIKE_KEYS = new Set([
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
]);

const SAFE_PUBLIC_VALUES = new Set([
  "",
  LOCAL_ORIGIN,
  "devnet",
  "manual",
  "true",
  "false",
  "USDC",
  "SOL",
  "circuit.skr",
  "https://stationapi.veriff.com",
  "ABRAXASverify1111111111111111111111111111111",
]);

type ParsedAssignment = {
  key: string;
  value: string;
  line: string;
  lineNumber: number;
};

function readText(path: string): string {
  return readFileSync(path, "utf8");
}

function parseActiveAssignments(content: string): ParsedAssignment[] {
  const assignments: ParsedAssignment[] = [];

  content.split("\n").forEach((rawLine, index) => {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const match = trimmed.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (!match) return;

    assignments.push({
      key: match[1],
      value: match[2],
      line,
      lineNumber: index + 1,
    });
  });

  return assignments;
}

function hasInlineCommentAfterAssignment(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return false;

  const eqIndex = trimmed.indexOf("=");
  if (eqIndex === -1) return false;

  const valuePart = trimmed.slice(eqIndex + 1);
  return /(^|\s)#/.test(valuePart);
}

function isJwtLike(value: string): boolean {
  const trimmed = value.trim();
  return /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9._-]+/.test(trimmed);
}

function isAllowedDocumentationJwt(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (!isJwtLike(trimmed)) return true;
  return trimmed.includes("ci-placeholder");
}

function extractSupabaseProjectRef(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    const match = parsed.hostname.match(/^([a-z0-9-]+)\.supabase\.co$/i);
    return match?.[1]?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

function isNonfunctionalSupabaseUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  const projectRef = extractSupabaseProjectRef(trimmed);
  return projectRef === "placeholder";
}

function isRealSupabaseProjectRefUrl(value: string): boolean {
  const projectRef = extractSupabaseProjectRef(value);
  return projectRef !== null && projectRef !== "placeholder";
}

function extractCiFallbackLiterals(content: string, envKey: string): string[] {
  const pattern = new RegExp(
    `${envKey}:\\s*\\$\\{\\{\\s*secrets\\.${envKey}\\s*\\|\\|\\s*'([^']*)'\\s*\\}\\}`,
    "g",
  );
  const literals: string[] = [];
  for (const match of Array.from(content.matchAll(pattern))) {
    literals.push(match[1]);
  }
  return literals;
}

function isSecretShapedValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (SAFE_PUBLIC_VALUES.has(trimmed)) return null;

  if (/^sk_(live|test)_/i.test(trimmed)) return "stripe/moonpay secret key prefix";
  if (/^suiprivkey/i.test(trimmed)) return "sui private key prefix";
  if (/^re_[A-Za-z0-9]{10,}/.test(trimmed)) return "resend api key shape";
  if (/^abx_(live|test)_/i.test(trimmed)) return "partner api key shape";
  if (isJwtLike(trimmed) && !isAllowedDocumentationJwt(trimmed)) {
    return "jwt-shaped credential";
  }
  if (trimmed.includes('"kty"') && trimmed.includes('"d"')) return "private jwk json";
  if (/^-----BEGIN /i.test(trimmed)) return "pem block";

  return null;
}

describe(".env.local.example contract", () => {
  const example = readText(EXAMPLE_PATH);
  const assignments = parseActiveAssignments(example);

  it("contains no stale abraxas-app.vercel.app references", () => {
    expect(example).not.toContain(STALE_HOST);
  });

  it("does not define NEXTAUTH_URL", () => {
    expect(example).not.toMatch(/^NEXTAUTH_URL=/m);
    expect(assignments.some((row) => row.key === "NEXTAUTH_URL")).toBe(false);
  });

  it("documents required local keys", () => {
    const keys = new Set(assignments.map((row) => row.key));
    for (const key of REQUIRED_DOCUMENTED_KEYS) {
      expect(keys.has(key), `missing documented key ${key}`).toBe(true);
    }
  });

  it("uses localhost for active app origin and issuer assignments", () => {
    const appUrl = assignments.find((row) => row.key === "NEXT_PUBLIC_APP_URL");
    const issuerUrl = assignments.find((row) => row.key === "ABRAXAS_ISSUER_URL");
    expect(appUrl?.value).toBe(LOCAL_ORIGIN);
    expect(issuerUrl?.value).toBe(LOCAL_ORIGIN);
  });

  it("does not use abraxasworld.xyz as an active issuer or app origin value", () => {
    for (const row of assignments) {
      if (row.key === "NEXT_PUBLIC_APP_URL" || row.key === "ABRAXAS_ISSUER_URL") {
        expect(row.value).not.toContain("abraxasworld.xyz");
      }
    }
  });

  it("marks ADMIN_EMAIL as legacy notification-only when retained", () => {
    const adminEmail = assignments.find((row) => row.key === "ADMIN_EMAIL");
    if (!adminEmail) return;

    const preceding = example
      .slice(0, example.indexOf(adminEmail.line))
      .split("\n")
      .slice(-8)
      .join("\n")
      .toLowerCase();

    expect(preceding).toMatch(/legacy/);
    expect(preceding).toMatch(/notification/);
    expect(preceding).toMatch(/abraxas_admin_emails/);
  });

  it("has no inline comments after active KEY=value assignments", () => {
    const offenders = assignments
      .filter((row) => hasInlineCommentAfterAssignment(row.line))
      .map((row) => `${row.lineNumber}: ${row.line}`);
    expect(offenders).toEqual([]);
  });

  it("does not assign secret-shaped values to active keys", () => {
    const offenders: string[] = [];
    for (const row of assignments) {
      const reason = isSecretShapedValue(row.value);
      if (reason) offenders.push(`${row.key}=${row.value} (${reason})`);
    }
    expect(offenders).toEqual([]);
  });

  it("keeps NEXT_PUBLIC_SUPABASE_URL empty or a clearly nonfunctional placeholder", () => {
    const supabaseUrl = assignments.find((row) => row.key === "NEXT_PUBLIC_SUPABASE_URL");
    expect(supabaseUrl).toBeDefined();
    expect(isNonfunctionalSupabaseUrl(supabaseUrl?.value ?? "")).toBe(true);
  });

  it("does not assign Supabase URLs with real project-ref hostnames", () => {
    const offenders = assignments
      .filter((row) => SUPABASE_URL_KEYS.has(row.key) && isRealSupabaseProjectRefUrl(row.value))
      .map((row) => `${row.key}=${row.value}`);
    expect(offenders).toEqual([]);
  });

  it("does not assign non-placeholder JWT-like Supabase key values", () => {
    const offenders = assignments
      .filter((row) => JWT_LIKE_KEYS.has(row.key) && !isAllowedDocumentationJwt(row.value))
      .map((row) => `${row.key}=${row.value}`);
    expect(offenders).toEqual([]);
  });

  it("documents Partner Flow vs Passport Google client id tiers", () => {
    expect(example).toMatch(/\[LOCAL-PF\]/);
    expect(example).toMatch(/\[LOCAL-PP\]/);
    expect(example.toLowerCase()).toMatch(/not required for partner flow/);
    expect(example.toLowerCase()).toMatch(/passport google sign-in/i);
  });

  it("documents ADMIN_PIN as local/demo compatibility and production allowlist sessions", () => {
    expect(example.toLowerCase()).toMatch(/admin_pin/);
    expect(example.toLowerCase()).toMatch(/local\/demo/);
    expect(example.toLowerCase()).toMatch(/production-sensitive admin/);
    expect(example.toLowerCase()).toMatch(/allowlisted browser session/);
    expect(example).not.toMatch(/ADMIN_PIN=.*\[PROD\]/);
  });

  it("documents keyless partner API behavior as local development only", () => {
    expect(example.toLowerCase()).toMatch(/keyless/);
    expect(example.toLowerCase()).toMatch(/local development/);
    expect(example.toLowerCase()).toMatch(/prod-like/);
    expect(example).toMatch(/REQUIRE_PARTNER_API_KEY=true/);
  });
});

describe(".github/workflows/ci.yml env contract", () => {
  const ci = readText(CI_PATH);

  it("contains no stale abraxas-app.vercel.app references", () => {
    expect(ci).not.toContain(STALE_HOST);
  });

  it("does not set NEXTAUTH_URL", () => {
    expect(ci).not.toMatch(/^\s*NEXTAUTH_URL:/m);
    expect(ci).not.toContain("NEXTAUTH_URL");
  });

  it("uses only the nonfunctional Supabase placeholder URL as CI fallback", () => {
    const fallbacks = extractCiFallbackLiterals(ci, "NEXT_PUBLIC_SUPABASE_URL");
    expect(fallbacks).toEqual([CI_SUPABASE_PLACEHOLDER_URL]);
    for (const fallback of fallbacks) {
      expect(isNonfunctionalSupabaseUrl(fallback)).toBe(true);
      expect(isRealSupabaseProjectRefUrl(fallback)).toBe(false);
    }
  });

  it("uses only ci-placeholder JWT fallbacks for Supabase keys", () => {
    for (const key of Array.from(JWT_LIKE_KEYS)) {
      const fallbacks = extractCiFallbackLiterals(ci, key);
      expect(fallbacks.length).toBeGreaterThan(0);
      for (const fallback of fallbacks) {
        expect(isJwtLike(fallback)).toBe(true);
        expect(isAllowedDocumentationJwt(fallback)).toBe(true);
      }
    }
  });
});
