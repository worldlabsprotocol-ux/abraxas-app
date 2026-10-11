#!/usr/bin/env npx tsx
/** Build #526 — sandbox activation preflight (non-production targets only). */

import { writeFileSync, mkdirSync } from "node:fs";
import { runSandboxActivationPreflight } from "@/lib/institutional/sandbox/sandboxActivationPreflight";

const OUT = "/opt/cursor/artifacts/institutional-sandbox-preflight.json";

async function main() {
  mkdirSync("/opt/cursor/artifacts", { recursive: true });
  const report = await runSandboxActivationPreflight();
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(`\nWrote ${OUT}`);
  if (report.overall === "FAIL") process.exit(2);
  if (report.overall === "BLOCKED") process.exit(3);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
