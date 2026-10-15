#!/usr/bin/env npx tsx
// FILE: scripts/build-572/staging-execution-report.ts
// Summarize Build #572 staging execution status without secrets (founder workstation or CI).

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function runAuditJson(): unknown {
  const result = spawnSync("npm", ["run", "-s", "build-571:staging-readiness-audit"], {
    encoding: "utf8",
    env: process.env,
    maxBuffer: 16 * 1024 * 1024,
  });
  const out = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (!out.trim()) {
    throw new Error(result.error?.message ?? "audit_output_empty");
  }
  const start = out.indexOf("{");
  if (start < 0) throw new Error("audit_output_missing_json");
  return JSON.parse(out.slice(start));
}

function main() {
  const handoffPath = join(process.cwd(), "docs/build572-sovereign-passport-staging-execution.md");
  const pilotPath = join(process.cwd(), "docs/partner-handoff/institutional-pilot-staging-572.md");
  let audit: unknown = null;
  let auditError: string | null = null;
  try {
    audit = runAuditJson();
  } catch (error) {
    auditError = error instanceof Error ? error.message : String(error);
  }

  const report = {
    build: 572,
    generated_at: new Date().toISOString(),
    staging_http_base_url_configured: Boolean(process.env.ABRAXAS_STAGING_HTTP_BASE_URL?.trim()),
    sovereign_env_class: process.env.ABRAXAS_SOVEREIGN_ENV_CLASS?.trim() ?? null,
    staging_environment_id: process.env.ABRAXAS_STAGING_ENVIRONMENT_ID?.trim() ? "configured" : "missing",
    handoff_docs_present: existsSync(handoffPath) && existsSync(pilotPath),
    readiness_audit: audit,
    readiness_audit_error: auditError,
    execution_status: "blocked_founder_staging_not_observed",
    note: "This report does not substitute witnessed staging execution. Run on founder staging host after Build #571 activation_ready.",
  };
  console.log(JSON.stringify(report, null, 2));
  const ready =
    typeof audit === "object"
    && audit !== null
    && (audit as { activation_ready?: boolean }).activation_ready === true;
  process.exit(ready ? 0 : 2);
}

main();
