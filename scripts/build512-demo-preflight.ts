#!/usr/bin/env npx tsx
/**
 * Build #512 — read-only Demo preflight (no migrations, no secret output).
 */
import { runSolanaNativeDemoPreflight } from "@/lib/integration/solanaNativeDemoPreflight";

async function main() {
  const result = await runSolanaNativeDemoPreflight({ env: process.env });
  for (const check of result.checks) {
    console.log(`${check.status.toUpperCase().padEnd(7)} ${check.id}: ${check.detail}`);
  }
  process.exit(result.exitCode);
}

main().catch((e) => {
  console.error("preflight_failed", e instanceof Error ? e.message : e);
  process.exit(1);
});
