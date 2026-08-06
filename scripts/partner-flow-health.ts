#!/usr/bin/env npx tsx
// FILE: scripts/partner-flow-health.ts
// Read-only CLI for Partner Flow operational health (last 24h).

import { buildPartnerFlowHealthReport } from "@/lib/partner/partnerFlowHealth";

async function main() {
  const report = await buildPartnerFlowHealthReport(24);

  console.log("=== Partner Flow operational health (24h) ===\n");
  console.log(`Generated: ${report.generated_at}`);
  console.log(`Sources: partner_api_usage=${report.sources.partner_api_usage}, in_memory=${report.sources.in_memory_telemetry}`);
  console.log(`Rate limit: enabled=${report.rate_limit.enabled}, backend=${report.rate_limit.backend}`);
  if (!report.rate_limit.distributedStoreConfigured) {
    console.log(`Note: ${report.rate_limit.note}`);
  }

  console.log("\nTotals:");
  console.log(`  requests: ${report.telemetry.total_requests}`);
  console.log(`  rate_limited (429): ${report.telemetry.rate_limited_total}`);
  console.log(`  errors: ${report.telemetry.error_total}`);
  console.log(`  audit persistence failures: ${report.telemetry.audit_persistence_failures}`);

  if (report.telemetry.by_endpoint.length === 0) {
    console.log("\nNo endpoint breakdown available.");
    process.exit(0);
  }

  console.log("\nBy endpoint:");
  for (const row of report.telemetry.by_endpoint) {
    console.log(
      `  ${row.method} ${row.endpoint}: total=${row.total} 429=${row.rate_limited} err=${(row.error_rate * 100).toFixed(1)}% avg=${row.avg_latency_ms}ms p95=${row.p95_latency_ms}ms`,
    );
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
