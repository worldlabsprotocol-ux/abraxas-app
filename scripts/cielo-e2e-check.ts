#!/usr/bin/env npx ts-node
// FILE: scripts/cielo-e2e-check.ts
// CLI harness for Cielo revenue loop — run after deploy or env changes.
//
// Usage:
//   npx ts-node scripts/cielo-e2e-check.ts
//   BASE_URL=https://abraxas-app.vercel.app npx ts-node scripts/cielo-e2e-check.ts

import { runCieloE2eChecks } from "../lib/cieloE2eCheck";

async function main() {
  const baseUrl = process.env.BASE_URL?.replace(/\/$/, "");

  console.log("\n🔷 Abraxas Cielo E2E Check\n");

  if (baseUrl) {
    console.log(`Remote: ${baseUrl}/api/ops/cielo-e2e\n`);
    try {
      const res = await fetch(`${baseUrl}/api/ops/cielo-e2e`);
      const data = await res.json() as {
        checks: Array<{ label: string; status: string; detail: string }>;
        passCount: number;
        warnCount: number;
        failCount: number;
        readyForDemo: boolean;
      };
      for (const c of data.checks) {
        const icon = c.status === "pass" ? "✓" : c.status === "warn" ? "!" : "✗";
        console.log(`  ${icon} ${c.label}: ${c.detail}`);
      }
      console.log(`\n  Pass: ${data.passCount} · Warn: ${data.warnCount} · Fail: ${data.failCount}`);
      console.log(`  Demo ready: ${data.readyForDemo ? "YES" : "NO"}\n`);
      process.exit(data.failCount > 0 ? 1 : 0);
    } catch (e) {
      console.error("Remote check failed:", e);
      process.exit(1);
    }
  }

  const result = await runCieloE2eChecks();
  for (const c of result.checks) {
    const icon = c.status === "pass" ? "✓" : c.status === "warn" ? "!" : "✗";
    console.log(`  ${icon} [${c.group}] ${c.label}: ${c.detail}`);
  }
  console.log(`\n  Pass: ${result.passCount} · Warn: ${result.warnCount} · Fail: ${result.failCount}`);
  console.log(`  Demo ready: ${result.readyForDemo ? "YES" : "NO"}\n`);
  process.exit(result.failCount > 0 ? 1 : 0);
}

main();
