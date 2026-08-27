// FILE: lib/integrations/designPartnerIntakeHealth.ts
// Server-only design-partner intake health report builder.

import { loadReceiptSigningKey } from "@/lib/decisionReceipts/signing";
import {
  DESIGN_PARTNER_INTAKE_HEALTH_CHECK_ORDER,
  MIGRATION_071_OPERATOR_ATTESTATION,
  resolveOverallStatus,
  type DesignPartnerIntakeHealthCheck,
  type DesignPartnerIntakeHealthReport,
  type IntakeHealthCheckStatus,
  type IntakeHealthRuntimeEnvironment,
} from "@/lib/admin/designPartnerIntakeHealthContract";
import {
  getPartnerFlowUpstashConfigState,
  type PartnerFlowUpstashConfigState,
} from "@/lib/partner/partnerFlowUpstashStore";
import {
  isPartnerFlowProductionRuntime,
  isPartnerFlowRateLimitEnabled,
  resolvePartnerFlowRateLimitSecret,
} from "@/lib/partner/partnerFlowRateLimit";

function envTrimmed(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export function evaluateProductionIntakeRateLimitReady(input: {
  runtimeEnvironment: IntakeHealthRuntimeEnvironment;
  rateLimitingEnabled: boolean;
  hmacConfigured: boolean;
  upstashState: PartnerFlowUpstashConfigState;
}): IntakeHealthCheckStatus {
  if (input.runtimeEnvironment !== "production") {
    return "pass";
  }
  if (!input.rateLimitingEnabled) {
    return "fail";
  }
  if (!input.hmacConfigured) {
    return "fail";
  }
  if (input.upstashState !== "complete") {
    return "fail";
  }
  return "pass";
}

function evaluateProofSigningConfigured(): IntakeHealthCheckStatus {
  try {
    return loadReceiptSigningKey() ? "pass" : "fail";
  } catch {
    return "fail";
  }
}

export function buildDesignPartnerIntakeHealthReport(): DesignPartnerIntakeHealthReport {
  const runtimeEnvironment: IntakeHealthRuntimeEnvironment = isPartnerFlowProductionRuntime()
    ? "production"
    : "non_production";
  const rateLimitingEnabled = isPartnerFlowRateLimitEnabled();
  const upstashState = getPartnerFlowUpstashConfigState();
  const hmacConfigured = resolvePartnerFlowRateLimitSecret().configured;

  const checkValues: Record<DesignPartnerIntakeHealthCheck["key"], IntakeHealthCheckStatus> = {
    intake_route_configured:
      envTrimmed("NEXT_PUBLIC_SUPABASE_URL") && envTrimmed("SUPABASE_SERVICE_ROLE_KEY")
        ? "pass"
        : "fail",
    rate_limiting_enabled: rateLimitingEnabled ? "pass" : "fail",
    upstash_configuration_present: upstashState === "complete" ? "pass" : "fail",
    upstash_configuration_valid: upstashState !== "incomplete" ? "pass" : "fail",
    hmac_secret_configured: hmacConfigured ? "pass" : "fail",
    operator_notification_configured:
      envTrimmed("RESEND_API_KEY") && envTrimmed("ADMIN_EMAIL") ? "pass" : "fail",
    proof_signing_configured: evaluateProofSigningConfigured(),
    production_intake_rate_limit_ready: evaluateProductionIntakeRateLimitReady({
      runtimeEnvironment,
      rateLimitingEnabled,
      hmacConfigured,
      upstashState,
    }),
  };

  const checks = DESIGN_PARTNER_INTAKE_HEALTH_CHECK_ORDER.map((key) => ({
    key,
    status: checkValues[key],
  }));

  const report: DesignPartnerIntakeHealthReport = {
    generated_at: new Date().toISOString(),
    overall_status: "ready",
    runtime_environment: runtimeEnvironment,
    checks,
    operator_attestation: {
      migration_071: MIGRATION_071_OPERATOR_ATTESTATION,
    },
  };

  report.overall_status = resolveOverallStatus(report);
  return report;
}
