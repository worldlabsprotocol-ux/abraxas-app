#!/usr/bin/env npx tsx
// FILE: scripts/build-898/external-rp-enforcement-fixtures.ts
// Separate-process relying party — fixture permit/deny enforcement (no live sandbox required).

import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = "/opt/cursor/artifacts/build-898";

function main(): void {
  mkdirSync(OUT, { recursive: true });
  const root = process.cwd();
  let exitCode = 0;
  let output = "";
  try {
    output = execSync(
      "./node_modules/.bin/vitest run examples/external-node-partner/externalPartner.test.ts",
      { cwd: root, encoding: "utf8", stdio: "pipe" },
    );
  } catch (error) {
    exitCode = 1;
    output = error instanceof Error && "stdout" in error
      ? String((error as { stdout?: string }).stdout ?? "") + String((error as { stderr?: string }).stderr ?? "")
      : String(error);
  }
  const report = {
    build: 898,
    track: "external_node_partner_fixture_enforcement",
    ok: exitCode === 0,
    executed_at: new Date().toISOString(),
    note: "Proves permit/deny enforcement logic in examples/external-node-partner (fixtures). Live sandbox handoff is operator-driven.",
    output_tail: output.split("\n").slice(-40).join("\n"),
  };
  writeFileSync(join(OUT, "external-rp-enforcement-fixtures.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ok: report.ok, artifact: join(OUT, "external-rp-enforcement-fixtures.json") }, null, 2));
  if (exitCode !== 0) process.exit(1);
}

main();
