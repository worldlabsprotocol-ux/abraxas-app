// FILE: lib/sovereignRuntime/institutionalActivationEnv.ts
// Back-compat wrapper — prefer sovereignActivationPolicy for new code.

import {
  validateInstitutionalReadinessEnv,
  type InstitutionalReadinessReport,
} from "./sovereignActivationPolicy";

export type InstitutionalEnvIssue = {
  code: string;
  message: string;
  severity: "error" | "warning";
};

export type InstitutionalEnvReport = {
  ok: boolean;
  errors: InstitutionalEnvIssue[];
  warnings: InstitutionalEnvIssue[];
};

export function validateInstitutionalSovereignEnv(
  env: Record<string, string | undefined> = process.env,
): InstitutionalEnvReport {
  const report: InstitutionalReadinessReport = validateInstitutionalReadinessEnv(env);
  return {
    ok: report.ok,
    errors: report.errors.map((e) => ({ ...e, severity: "error" as const })),
    warnings: report.notes.map((message) => ({
      code: "institutional_note",
      message,
      severity: "warning" as const,
    })),
  };
}
