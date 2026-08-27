// FILE: lib/admin/designPartnerIntakeHealthUi.ts
// Client-safe parser and presentation helpers for intake health UI.

import {
  INTAKE_HEALTH_BLOCKER_COPY,
  MIGRATION_071_OPERATOR_ATTESTATION,
  isDesignPartnerIntakeHealthReport,
  resolveOverallStatus,
  type DesignPartnerIntakeHealthCheck,
  type DesignPartnerIntakeHealthReport,
  type IntakeHealthCheckKey,
  type IntakeHealthOverallStatus,
} from "@/lib/admin/designPartnerIntakeHealthContract";

export type IntakeHealthFetchErrorKind = "unauthorized" | "unavailable" | "invalid_response" | "network";

export class IntakeHealthFetchError extends Error {
  readonly kind: IntakeHealthFetchErrorKind;

  constructor(kind: IntakeHealthFetchErrorKind, message: string) {
    super(message);
    this.name = "IntakeHealthFetchError";
    this.kind = kind;
  }
}

export function parseDesignPartnerIntakeHealthResponse(payload: unknown): DesignPartnerIntakeHealthReport {
  if (!isDesignPartnerIntakeHealthReport(payload)) {
    throw new IntakeHealthFetchError("invalid_response", "Intake health response was not allowlisted.");
  }
  const expectedOverall = resolveOverallStatus(payload);
  if (payload.overall_status !== expectedOverall) {
    throw new IntakeHealthFetchError("invalid_response", "Intake health overall status did not match checks.");
  }
  return payload;
}

export function intakeHealthHeadline(status: IntakeHealthOverallStatus): string {
  if (status === "ready") return "Ready";
  if (status === "degraded") return "Degraded";
  return "Misconfigured";
}

export function intakeHealthBlockers(report: DesignPartnerIntakeHealthReport): string[] {
  const blockers: string[] = [];
  for (const check of report.checks) {
    if (check.status === "fail") {
      blockers.push(INTAKE_HEALTH_BLOCKER_COPY[check.key]);
    }
  }
  return blockers;
}

export function intakeHealthCriticalBlockers(report: DesignPartnerIntakeHealthReport): string[] {
  const criticalKeys = new Set<IntakeHealthCheckKey>([
    "intake_route_configured",
    "upstash_configuration_valid",
    "rate_limiting_enabled",
    "production_intake_rate_limit_ready",
  ]);
  return report.checks
    .filter((check: DesignPartnerIntakeHealthCheck) => check.status === "fail" && criticalKeys.has(check.key))
    .map((check) => INTAKE_HEALTH_BLOCKER_COPY[check.key]);
}

export {
  INTAKE_HEALTH_BLOCKER_COPY,
  MIGRATION_071_OPERATOR_ATTESTATION,
  resolveOverallStatus,
};
