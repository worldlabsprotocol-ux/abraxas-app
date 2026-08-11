// FILE: scripts/demo/lib/demoProjectGuard.ts
// Read-only demo environment guards — Phase A (no mutation authorization).

import { KNOWN_PRODUCTION_SUPABASE_PROJECT_REFS } from "./knownProductionSupabaseProjectRefs";

const SUPABASE_HOST_PATTERN = /^([a-z0-9-]+)\.supabase\.co$/i;

const SECRET_ENV_KEYS = new Set([
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "ABRAXAS_SIGNING_KEY",
  "ABRAXAS_PUBLIC_KEY",
  "ADMIN_PIN",
  "ABRAXAS_BROWSER_SESSION_SECRET",
  "CRON_SECRET",
  "ABRAXAS_WEBHOOK_MASTER_KEY",
  "INTERNAL_API_SECRET",
  "RESEND_API_KEY",
  "NEXTAUTH_SECRET",
]);

export type DemoProjectGuardErrorCode =
  | "demo_ref_missing"
  | "production_ref_missing"
  | "production_ref_unknown"
  | "demo_ref_mismatch"
  | "demo_equals_production"
  | "target_is_production"
  | "malformed_supabase_url"
  | "supabase_url_missing";

export class DemoProjectGuardError extends Error {
  readonly code: DemoProjectGuardErrorCode;

  constructor(code: DemoProjectGuardErrorCode, message: string) {
    super(message);
    this.name = "DemoProjectGuardError";
    this.code = code;
  }
}

export interface DemoProjectGuardConfig {
  demoProjectRef: string;
  productionProjectRef: string;
  maskedSupabaseUrl: string;
}

function trimRef(value: string | undefined): string {
  return value?.trim() ?? "";
}

function parseCommaSeparatedRefs(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Collect every production ref that must never be targeted by demo tooling. */
export function collectProductionDeniedRefs(
  env: Record<string, string | undefined>,
  knownProductionRefs: readonly string[] = KNOWN_PRODUCTION_SUPABASE_PROJECT_REFS,
): Set<string> {
  const denied = new Set<string>();

  for (const ref of knownProductionRefs) {
    const trimmed = trimRef(ref);
    if (trimmed) denied.add(trimmed);
  }

  const productionRef = trimRef(env.PRODUCTION_SUPABASE_PROJECT_REF);
  if (productionRef) denied.add(productionRef);

  for (const ref of parseCommaSeparatedRefs(env.DEMO_DENIED_SUPABASE_PROJECT_REFS)) {
    denied.add(ref);
  }

  return denied;
}

export function assertProductionRefIsKnown(
  productionRef: string,
  knownProductionRefs: readonly string[] = KNOWN_PRODUCTION_SUPABASE_PROJECT_REFS,
): void {
  if (knownProductionRefs.length === 0) {
    throw new DemoProjectGuardError(
      "production_ref_unknown",
      "No repository-controlled production Supabase refs are configured — update KNOWN_PRODUCTION_SUPABASE_PROJECT_REFS via repository PR before running demo tooling",
    );
  }

  const isKnown = knownProductionRefs.some((knownRef) => trimRef(knownRef) === productionRef);
  if (!isKnown) {
    throw new DemoProjectGuardError(
      "production_ref_unknown",
      `PRODUCTION_SUPABASE_PROJECT_REF (${maskProjectRef(productionRef)}) does not match any repository-controlled production reference`,
    );
  }
}

export function assertRefNotProductionTarget(
  ref: string,
  deniedRefs: Set<string>,
  code: DemoProjectGuardErrorCode = "target_is_production",
): void {
  if (deniedRefs.has(ref)) {
    throw new DemoProjectGuardError(
      code,
      `Supabase project ref (${maskProjectRef(ref)}) is denied for demo validation`,
    );
  }
}

/** Parse project ref from a Supabase REST URL. */
export function parseSupabaseProjectRef(supabaseUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(supabaseUrl.trim());
  } catch {
    throw new DemoProjectGuardError(
      "malformed_supabase_url",
      "NEXT_PUBLIC_SUPABASE_URL is not a valid URL",
    );
  }

  if (parsed.protocol !== "https:") {
    throw new DemoProjectGuardError(
      "malformed_supabase_url",
      "NEXT_PUBLIC_SUPABASE_URL must use https",
    );
  }

  const match = SUPABASE_HOST_PATTERN.exec(parsed.hostname);
  if (!match?.[1]) {
    throw new DemoProjectGuardError(
      "malformed_supabase_url",
      "NEXT_PUBLIC_SUPABASE_URL must be a *.supabase.co project URL",
    );
  }

  return match[1];
}

/** Mask a Supabase URL for operator logs. */
export function maskSupabaseUrl(supabaseUrl: string): string {
  try {
    const ref = parseSupabaseProjectRef(supabaseUrl);
    return `https://${maskProjectRef(ref)}.supabase.co`;
  } catch {
    return "<invalid-supabase-url>";
  }
}

/** Mask a project ref, keeping first/last segments for correlation. */
export function maskProjectRef(ref: string): string {
  const trimmed = ref.trim();
  if (trimmed.length <= 8) return "***";
  return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`;
}

/** Mask a Sui address for logs. */
export function maskSubjectId(subjectId: string): string {
  const trimmed = subjectId.trim();
  if (!trimmed.startsWith("0x") || trimmed.length < 12) return "<masked-subject>";
  return `${trimmed.slice(0, 8)}…${trimmed.slice(-6)}`;
}

/**
 * Validate read-only demo vs production Supabase project configuration.
 * Fails closed when production ref is missing, unknown, or refs collide.
 */
export function validateReadOnlyDemoConfig(
  env: Record<string, string | undefined> = process.env,
  options?: {
    knownProductionRefs?: readonly string[];
  },
): DemoProjectGuardConfig {
  const knownProductionRefs =
    options?.knownProductionRefs ?? KNOWN_PRODUCTION_SUPABASE_PROJECT_REFS;
  const demoRef = trimRef(env.DEMO_SUPABASE_PROJECT_REF);
  const productionRef = trimRef(env.PRODUCTION_SUPABASE_PROJECT_REF);
  const supabaseUrl = trimRef(env.NEXT_PUBLIC_SUPABASE_URL);
  const deniedRefs = collectProductionDeniedRefs(env, knownProductionRefs);

  if (!demoRef) {
    throw new DemoProjectGuardError(
      "demo_ref_missing",
      "DEMO_SUPABASE_PROJECT_REF is required",
    );
  }

  if (!productionRef) {
    throw new DemoProjectGuardError(
      "production_ref_missing",
      "PRODUCTION_SUPABASE_PROJECT_REF is required (fail-closed isolation guard)",
    );
  }

  assertProductionRefIsKnown(productionRef, knownProductionRefs);

  if (demoRef === productionRef) {
    throw new DemoProjectGuardError(
      "demo_equals_production",
      "DEMO_SUPABASE_PROJECT_REF must not equal PRODUCTION_SUPABASE_PROJECT_REF",
    );
  }

  assertRefNotProductionTarget(demoRef, deniedRefs, "target_is_production");

  if (!supabaseUrl) {
    throw new DemoProjectGuardError(
      "supabase_url_missing",
      "NEXT_PUBLIC_SUPABASE_URL is required",
    );
  }

  const parsedRef = parseSupabaseProjectRef(supabaseUrl);
  assertRefNotProductionTarget(parsedRef, deniedRefs, "target_is_production");

  if (parsedRef !== demoRef) {
    throw new DemoProjectGuardError(
      "demo_ref_mismatch",
      `NEXT_PUBLIC_SUPABASE_URL project ref (${maskProjectRef(parsedRef)}) does not match DEMO_SUPABASE_PROJECT_REF (${maskProjectRef(demoRef)})`,
    );
  }

  return {
    demoProjectRef: demoRef,
    productionProjectRef: productionRef,
    maskedSupabaseUrl: maskSupabaseUrl(supabaseUrl),
  };
}

/** Redact secret-like env values from strings before logging. */
export function redactSecrets(text: string, env: Record<string, string | undefined> = process.env): string {
  let redacted = text;
  for (const key of SECRET_ENV_KEYS) {
    const value = env[key];
    if (value && value.length > 0) {
      redacted = redacted.split(value).join(`<redacted:${key}>`);
    }
  }

  for (const ref of collectProductionDeniedRefs(env)) {
    if (ref.length > 8) {
      redacted = redacted.split(ref).join(maskProjectRef(ref));
    }
  }

  return redacted;
}
