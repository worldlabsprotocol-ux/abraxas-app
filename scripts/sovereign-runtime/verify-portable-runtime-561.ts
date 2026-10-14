#!/usr/bin/env npx tsx
/**
 * Build #561 — verify portable sovereign runtime readiness (observed, redacted).
 * Does not apply migrations or modify production databases.
 */
import { buildSovereignDependencyAuditObserved } from "../../lib/sovereignRuntime/sovereignDependencyAudit";

async function main(): Promise<void> {
  const report = await buildSovereignDependencyAuditObserved(process.env);
  const summary = {
    configured: report.provider_independent_core_configured,
    operational: report.provider_independent_core_operational,
    category_d_in_core: report.category_d_in_core,
    operational_readiness: report.operational_readiness,
  };
  console.log(JSON.stringify(summary, null, 2));
  process.exit(summary.operational ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
