#!/usr/bin/env npx tsx
// FILE: scripts/build-571/staging-readiness-audit.ts
// Founder controlled staging readiness baseline (no secrets in output).

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { buildStagingReadiness571 } from "@/lib/passport/stagingReadiness571";

function pgUrl(): string | null {
  return (
    process.env.ABRAXAS_SOVEREIGN_PG_URL?.trim()
    ?? process.env.ABRAXAS_DATABASE_URL?.trim()
    ?? null
  );
}

function tableExists(table: string): boolean {
  const url = pgUrl();
  if (!url) return false;
  try {
    const out = execFileSync(
      "psql",
      [url, "-tAc", `select to_regclass('public.${table}') is not null`],
      { encoding: "utf8" },
    ).trim();
    return out === "t";
  } catch {
    return false;
  }
}

function main() {
  const items = buildStagingReadiness571({
    env: process.env as Record<string, string | undefined>,
    productionBuildPresent: existsSync(join(process.cwd(), ".next/BUILD_ID")),
    tableExists,
  });
  const report = {
    build: 571,
    generated_at: new Date().toISOString(),
    database: pgUrl() ? pgUrl()!.replace(/:[^:@/]+@/, ":***@") : null,
    items,
    summary: {
      ready: items.filter((i) => i.status === "ready").length,
      missing: items.filter((i) => i.status === "missing").length,
      blocked: items.filter((i) => i.status === "blocked").length,
    },
    browser_auth_note:
      "Authenticated holder browser evidence requires founder configured zkLogin or supported wallet path in the target staging origin.",
  };
  console.log(JSON.stringify(report, null, 2));
  const activationReady = items.every((i) => i.status === "ready");
  process.exit(activationReady ? 0 : 2);
}

main();
