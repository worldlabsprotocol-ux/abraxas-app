// FILE: lib/admin/partnerFlowReadinessUi.ts
// Client-safe labels, parsers, and fetch helpers for Production partner-flow readiness UI.

import { adminFetch } from "@/lib/admin/adminFetch";

export type SigningHealthReport = Record<string, boolean>;
export type ProvisioningPreflightReport = Record<string, boolean>;

export type ReadinessFetchErrorKind = "unauthorized" | "unavailable" | "invalid_response" | "network";

export class ReadinessFetchError extends Error {
  readonly kind: ReadinessFetchErrorKind;

  constructor(kind: ReadinessFetchErrorKind, message: string) {
    super(message);
    this.name = "ReadinessFetchError";
    this.kind = kind;
  }
}

export interface ReadinessCheckItem {
  key: string;
  label: string;
  pass: boolean;
}

/** Must stay aligned with PRODUCTION_SIGNING_HEALTH_KEYS in productionEnvironmentDiagnostics.ts */
const PRODUCTION_SIGNING_HEALTH_KEYS = new Set([
  "ok",
  "signing_key_configured",
  "signing_key_parse_ok",
  "public_key_configured",
  "public_key_parse_ok",
  "seed_matches_embedded_x",
  "seed_matches_public_env",
  "receipt_env_roundtrip_ok",
  "production_origin_exact",
  "demo_sandbox_flag_disabled",
  "demo_subject_id_unset",
  "signing_key_not_demo_key",
  "browser_session_secret_configured",
]);

/** Must stay aligned with PROVISIONING_PREFLIGHT_KEYS in partnerProvisioningPreflight.ts */
const PROVISIONING_PREFLIGHT_KEYS = new Set([
  "ok",
  "query_valid",
  "partner_row_exists",
  "partner_status_usable",
  "partner_is_external",
  "return_urls_configured",
  "return_url_allowlisted",
  "policy_row_exists",
  "policy_active",
  "policy_partner_match",
  "policy_not_sandbox",
  "onboarding_fields_present",
]);

const SIGNING_HEALTH_LABELS: Record<string, string> = {
  signing_key_configured: "Receipt signing key is configured",
  signing_key_parse_ok: "Receipt signing key parses correctly",
  public_key_configured: "Receipt public key is configured",
  public_key_parse_ok: "Receipt public key parses correctly",
  seed_matches_embedded_x: "Signing seed matches embedded public key",
  seed_matches_public_env: "Signing seed matches configured public key",
  receipt_env_roundtrip_ok: "Receipt sign-and-verify roundtrip succeeds",
  production_origin_exact: "Deployment origin is canonical Production",
  demo_sandbox_flag_disabled: "Demo sandbox flag is disabled",
  demo_subject_id_unset: "Demo sandbox subject is not configured",
  signing_key_not_demo_key: "Receipt signing key is not the demo key",
  browser_session_secret_configured: "Browser session secret is configured",
};

const PREFLIGHT_LABELS: Record<string, string> = {
  query_valid: "Partner, policy, and return URL inputs are valid",
  partner_row_exists: "Partner record exists",
  partner_status_usable: "Partner status is ready for launch",
  partner_is_external: "Partner is marked external",
  return_urls_configured: "Partner return URLs are configured",
  return_url_allowlisted: "Return URL is allowlisted for the partner",
  policy_row_exists: "Policy record exists",
  policy_active: "Policy is active",
  policy_partner_match: "Policy belongs to the partner",
  policy_not_sandbox: "Policy is not sandbox-only",
  onboarding_fields_present: "Partner onboarding fields are present",
};

const DISPLAY_SIGNING_KEYS = Array.from(PRODUCTION_SIGNING_HEALTH_KEYS).filter((key) => key !== "ok");
const DISPLAY_PREFLIGHT_KEYS = Array.from(PROVISIONING_PREFLIGHT_KEYS).filter((key) => key !== "ok");

function isBooleanRecord(payload: unknown, allowedKeys: Set<string>): payload is Record<string, boolean> {
  if (!payload || typeof payload !== "object") return false;
  const record = payload as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== allowedKeys.size) return false;
  for (const key of keys) {
    if (!allowedKeys.has(key)) return false;
    if (typeof record[key] !== "boolean") return false;
  }
  return true;
}

export function parseSigningHealthResponse(payload: unknown): SigningHealthReport {
  if (!isBooleanRecord(payload, PRODUCTION_SIGNING_HEALTH_KEYS)) {
    throw new ReadinessFetchError("invalid_response", "Signing health response was not boolean-only.");
  }
  return payload;
}

export function parseProvisioningPreflightResponse(payload: unknown): ProvisioningPreflightReport {
  if (!isBooleanRecord(payload, PROVISIONING_PREFLIGHT_KEYS)) {
    throw new ReadinessFetchError("invalid_response", "Provisioning preflight response was not boolean-only.");
  }
  return payload;
}

export function signingHealthCheckItems(report: SigningHealthReport): ReadinessCheckItem[] {
  return DISPLAY_SIGNING_KEYS.map((key) => ({
    key,
    label: SIGNING_HEALTH_LABELS[key] ?? key,
    pass: report[key] === true,
  }));
}

export function provisioningPreflightCheckItems(report: ProvisioningPreflightReport): ReadinessCheckItem[] {
  return DISPLAY_PREFLIGHT_KEYS.map((key) => ({
    key,
    label: PREFLIGHT_LABELS[key] ?? key,
    pass: report[key] === true,
  }));
}

async function readinessFetch(path: string): Promise<unknown> {
  let res: Response;
  try {
    res = await adminFetch(path, { cache: "no-store" });
  } catch {
    throw new ReadinessFetchError("network", "Could not reach the readiness endpoint.");
  }

  if (res.status === 401) {
    throw new ReadinessFetchError(
      "unauthorized",
      "Sign in with an authorized Google account",
    );
  }
  if (res.status === 404) {
    throw new ReadinessFetchError(
      "unavailable",
      "This readiness console is unavailable outside Production.",
    );
  }
  if (!res.ok) {
    throw new ReadinessFetchError("network", "Readiness request failed.");
  }

  return res.json();
}

export async function fetchSigningHealthReport(): Promise<SigningHealthReport> {
  const payload = await readinessFetch("/api/admin/partner-flow/signing-health");
  return parseSigningHealthResponse(payload);
}

export interface ReadinessConsoleSearchParams {
  partnerId: string;
  policyId: string;
  returnUrl: string;
}

export function parseReadinessSearchParams(
  input: URLSearchParams | { get: (key: string) => string | null },
): ReadinessConsoleSearchParams {
  return {
    partnerId: input.get("partner_id")?.trim() ?? "",
    policyId: input.get("policy_id")?.trim() ?? "",
    returnUrl: input.get("return_url")?.trim() ?? "",
  };
}

export function buildReadinessConsoleUrl(input: {
  partnerId: string;
  policyId: string;
  returnUrl: string;
}): string {
  const params = new URLSearchParams({
    partner_id: input.partnerId.trim(),
    policy_id: input.policyId.trim(),
    return_url: input.returnUrl.trim(),
  });
  return `/admin/partner-flow/readiness?${params.toString()}`;
}

export async function fetchProvisioningPreflightReport(input: {
  partnerId: string;
  policyId: string;
  returnUrl: string;
}): Promise<ProvisioningPreflightReport> {
  const params = new URLSearchParams({
    partner_id: input.partnerId.trim(),
    policy_id: input.policyId.trim(),
    return_url: input.returnUrl.trim(),
  });
  const payload = await readinessFetch(
    `/api/admin/partner-flow/provisioning-preflight?${params.toString()}`,
  );
  return parseProvisioningPreflightResponse(payload);
}
