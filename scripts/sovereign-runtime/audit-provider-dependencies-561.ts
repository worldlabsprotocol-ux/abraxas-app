#!/usr/bin/env npx tsx
/** Redacted provider dependency audit (Build #561) — configured + operational. */
import { buildSovereignDependencyAuditObserved } from "../../lib/sovereignRuntime/sovereignDependencyAudit";

async function main(): Promise<void> {
  const report = await buildSovereignDependencyAuditObserved(process.env);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
