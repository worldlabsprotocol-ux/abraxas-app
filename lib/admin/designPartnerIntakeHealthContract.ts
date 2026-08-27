// FILE: lib/admin/designPartnerIntakeHealthContract.ts
// Client-safe design-partner intake health contract — no env, signing, or server imports.

export type IntakeHealthOverallStatus = "ready" | "degraded" | "misconfigured";

export type IntakeHealthCheckStatus = "pass" | "fail" | "unknown";

export type IntakeHealthRuntimeEnvironment = "production" | "non_production";

export type IntakeHealthCheckKey =
  | "intake_route_configured"
  | "rate_limiting_enabled"
  | "upstash_configuration_present"
  | "upstash_configuration_valid"
  | "hmac_secret_configured"
  | "operator_notification_configured"
  | "proof_signing_configured"
  | "production_intake_rate_limit_ready";

export const DESIGN_PARTNER_INTAKE_HEALTH_CHECK_ORDER: readonly IntakeHealthCheckKey[] = [
  "intake_route_configured",
  "rate_limiting_enabled",
  "upstash_configuration_present",
  "upstash_configuration_valid",
  "hmac_secret_configured",
  "operator_notification_configured",
  "proof_signing_configured",
  "production_intake_rate_limit_ready",
] as const;

export const MIGRATION_071_OPERATOR_ATTESTATION = {
  runtime_status: "unknown" as const,
  copy: "Database hardening is operator-verified separately and cannot be checked by this runtime endpoint.",
};

export interface DesignPartnerIntakeHealthCheck {
  key: IntakeHealthCheckKey;
  status: IntakeHealthCheckStatus;
}

export interface DesignPartnerIntakeHealthReport {
  generated_at: string;
  overall_status: IntakeHealthOverallStatus;
  runtime_environment: IntakeHealthRuntimeEnvironment;
  checks: DesignPartnerIntakeHealthCheck[];
  operator_attestation: {
    migration_071: typeof MIGRATION_071_OPERATOR_ATTESTATION;
  };
}

export const INTAKE_HEALTH_BLOCKER_COPY: Record<IntakeHealthCheckKey, string> = {
  intake_route_configured: "Application intake database configuration is missing.",
  rate_limiting_enabled: "Rate limiting is disabled.",
  upstash_configuration_present: "Distributed rate limiting is not fully configured.",
  upstash_configuration_valid: "Upstash configuration is incomplete. Set both URL and token, or remove both.",
  hmac_secret_configured: "Rate-limit protection secret is not configured.",
  operator_notification_configured:
    "Operator email notifications are not configured. Applications may still save without admin alerts.",
  proof_signing_configured:
    "Authentication proof signing key is not configured. Applications may still save with unsigned proofs.",
  production_intake_rate_limit_ready:
    "Production intake rate-limit prerequisites are not met. Requests may be rejected.",
};

function checkStatus(
  report: DesignPartnerIntakeHealthReport,
  key: IntakeHealthCheckKey,
): IntakeHealthCheckStatus {
  return report.checks.find((entry) => entry.key === key)?.status ?? "fail";
}

export function resolveOverallStatus(
  report: DesignPartnerIntakeHealthReport,
): IntakeHealthOverallStatus {
  const isProduction = report.runtime_environment === "production";

  if (checkStatus(report, "intake_route_configured") === "fail") {
    return "misconfigured";
  }
  if (checkStatus(report, "upstash_configuration_valid") === "fail") {
    return "misconfigured";
  }
  if (isProduction && checkStatus(report, "rate_limiting_enabled") === "fail") {
    return "misconfigured";
  }
  if (isProduction && checkStatus(report, "production_intake_rate_limit_ready") === "fail") {
    return "misconfigured";
  }

  if (!isProduction && checkStatus(report, "rate_limiting_enabled") === "fail") {
    return "degraded";
  }
  if (!isProduction && checkStatus(report, "rate_limiting_enabled") === "pass") {
    if (checkStatus(report, "upstash_configuration_present") === "fail") {
      return "degraded";
    }
    if (checkStatus(report, "hmac_secret_configured") === "fail") {
      return "degraded";
    }
  }
  if (checkStatus(report, "operator_notification_configured") === "fail") {
    return "degraded";
  }
  if (checkStatus(report, "proof_signing_configured") === "fail") {
    return "degraded";
  }

  return "ready";
}

export function isDesignPartnerIntakeHealthReport(
  payload: unknown,
): payload is DesignPartnerIntakeHealthReport {
  if (!payload || typeof payload !== "object") return false;
  const record = payload as Record<string, unknown>;
  if (typeof record.generated_at !== "string") return false;
  if (record.overall_status !== "ready" && record.overall_status !== "degraded" && record.overall_status !== "misconfigured") {
    return false;
  }
  if (record.runtime_environment !== "production" && record.runtime_environment !== "non_production") {
    return false;
  }
  if (!Array.isArray(record.checks) || record.checks.length !== DESIGN_PARTNER_INTAKE_HEALTH_CHECK_ORDER.length) {
    return false;
  }

  for (let index = 0; index < DESIGN_PARTNER_INTAKE_HEALTH_CHECK_ORDER.length; index += 1) {
    const expectedKey = DESIGN_PARTNER_INTAKE_HEALTH_CHECK_ORDER[index];
    const check = record.checks[index];
    if (!check || typeof check !== "object") return false;
    const checkRecord = check as Record<string, unknown>;
    if (checkRecord.key !== expectedKey) return false;
    if (checkRecord.status !== "pass" && checkRecord.status !== "fail" && checkRecord.status !== "unknown") {
      return false;
    }
  }

  const attestation = record.operator_attestation;
  if (!attestation || typeof attestation !== "object") return false;
  const migration = (attestation as Record<string, unknown>).migration_071;
  if (!migration || typeof migration !== "object") return false;
  const migrationRecord = migration as Record<string, unknown>;
  if (migrationRecord.runtime_status !== "unknown") return false;
  if (migrationRecord.copy !== MIGRATION_071_OPERATOR_ATTESTATION.copy) return false;

  return true;
}
