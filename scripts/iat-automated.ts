#!/usr/bin/env npx tsx
// FILE: scripts/iat-automated.ts
// Automated IAT companion — read-only production checks + dated evidence report.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { resolveIatAutomatedOptions } from "@/lib/iat/iatAutomatedConfig";
import {
  defaultIatAutomatedDeps,
  formatIatAutomatedConsoleReport,
  runIatAutomated,
} from "@/lib/iat/iatAutomatedRunner";
import { formatIatAutomatedJson, formatIatAutomatedMarkdown } from "@/lib/iat/iatReport";
import { emptyScenarioAEvidenceTemplate } from "@/lib/iat/iatScenarioAEvidence";

async function main() {
  const options = resolveIatAutomatedOptions(process.env);
  const deps = defaultIatAutomatedDeps(process.env);

  const result = await runIatAutomated(options, deps);
  const scenarioA = emptyScenarioAEvidenceTemplate();

  console.log(formatIatAutomatedConsoleReport(result));

  const stamp = result.generatedAt.replace(/[:.]/g, "-");
  mkdirSync(options.reportDir, { recursive: true });
  const mdPath = join(options.reportDir, `iat-automated-${stamp}.md`);
  const jsonPath = join(options.reportDir, `iat-automated-${stamp}.json`);

  writeFileSync(mdPath, formatIatAutomatedMarkdown(result, scenarioA), "utf8");
  writeFileSync(jsonPath, formatIatAutomatedJson(result, scenarioA), "utf8");

  console.log("");
  console.log(`Report written:`);
  console.log(`  ${mdPath}`);
  console.log(`  ${jsonPath}`);

  if (result.exitCode !== 0) {
    process.exit(result.exitCode);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
