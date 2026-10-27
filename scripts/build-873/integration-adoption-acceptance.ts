#!/usr/bin/env npx tsx
// FILE: scripts/build-873/integration-adoption-acceptance.ts
// Repeatable adoption acceptance metrics — fixture/CI path (no privileged infra).

import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { auditCommercialMeteringCapabilities } from "../../lib/partner/universalIntegration/commercialMeteringAudit";
import { auditIntegrationAdoptionSecurityControls } from "../../lib/partner/universalIntegration/integrationAdoptionSecurityAudit";
import { integrationAdoptionManualStepCount } from "../../lib/developers/integrationAdoptionPath";

const ARTIFACT_DIR = "/opt/cursor/artifacts/build-873";

function runVitest(pattern: string): { ok: boolean; output: string } {
  try {
    const output = execSync(`./node_modules/.bin/vitest run ${pattern}`, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { ok: true, output };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    return { ok: false, output: `${e.stdout ?? ""}\n${e.stderr ?? ""}\n${e.message ?? ""}` };
  }
}

function main(): void {
  mkdirSync(ARTIFACT_DIR, { recursive: true });

  const suites = [
    "lib/developers/integrationAdoptionPath.test.ts",
    "lib/partner/universalIntegration/integrationAdoptionSecurityAudit.test.ts",
    "examples/external-node-partner/externalPartner.test.ts",
    "examples/integration-first-relying-party/integration-first.test.ts",
  ];

  const results = suites.map((suite) => ({ suite, ...runVitest(suite) }));
  const allOk = results.every((r) => r.ok);

  const report = {
    build: 873,
    ok: allOk,
    generated_at: new Date().toISOString(),
    manual_setup_steps: integrationAdoptionManualStepCount(),
    reference_integration: "examples/external-node-partner",
    vitest: results.map((r) => ({ suite: r.suite, ok: r.ok })),
    security_controls: auditIntegrationAdoptionSecurityControls(),
    commercial_metering: auditCommercialMeteringCapabilities(),
    measured: {
      time_to_first_verification_seconds: null,
      time_to_independent_receipt_seconds: null,
      note: "Live timings require deployed sandbox run — not fabricated in CI.",
    },
  };

  const outPath = join(ARTIFACT_DIR, "integration-adoption-acceptance.json");
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ok: allOk, artifact: outPath }, null, 2));
  if (!allOk) process.exit(1);
}

main();
