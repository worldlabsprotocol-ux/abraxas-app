#!/usr/bin/env npx tsx
// FILE: scripts/release-readiness.ts
// Read-only release gate evidence aggregation — never mutates Supabase or production.

import {
  formatReleaseReadinessReport,
  resolveReleaseReadinessOptions,
  runReleaseReadiness,
} from "@/lib/release/releaseReadinessRunner";

async function main() {
  const options = resolveReleaseReadinessOptions(process.env);
  const result = await runReleaseReadiness(options);
  console.log(formatReleaseReadinessReport(result));

  if (result.exitCode !== 0) {
    process.exit(result.exitCode);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
