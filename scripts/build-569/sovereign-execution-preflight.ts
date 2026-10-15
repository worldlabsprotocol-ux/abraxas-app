#!/usr/bin/env npx tsx
// FILE: scripts/build-569/sovereign-execution-preflight.ts
// Isolated sovereign Passport execution preflight (schema + trust config names only).

import { execFileSync } from "node:child_process";

const pgUrl = process.env.ABRAXAS_SOVEREIGN_PG_URL?.trim()
  ?? process.env.ABRAXAS_DATABASE_URL?.trim();

type Check = { id: string; ok: boolean; detail: string };

function checkEnv(name: string, required = true): Check {
  const value = process.env[name]?.trim();
  const ok = required ? Boolean(value) : true;
  return {
    id: `env:${name}`,
    ok: required ? ok : true,
    detail: ok ? "present" : required ? "missing" : "optional missing",
  };
}

function checkTable(table: string): Check {
  if (!pgUrl) {
    return { id: `table:${table}`, ok: false, detail: "no database url" };
  }
  try {
    const out = execFileSync(
      "psql",
      [pgUrl, "-tAc", `select to_regclass('public.${table}') is not null`],
      { encoding: "utf8" },
    ).trim();
    const ok = out === "t";
    return { id: `table:${table}`, ok, detail: ok ? "exists" : "missing" };
  } catch (error) {
    return { id: `table:${table}`, ok: false, detail: String(error) };
  }
}

function main() {
  const checks: Check[] = [
    checkEnv("ABRAXAS_PERSISTENCE_BACKEND"),
    checkEnv("ABRAXAS_PASSPORT_REUSABLE_CREDENTIAL_STORAGE"),
    checkEnv("ABRAXAS_PASSPORT_CREDENTIAL_ISSUER_REGISTRY"),
    checkEnv("ABRAXAS_RECEIPT_VERIFICATION_REGISTRY"),
    checkEnv("ABRAXAS_SIGNING_KEY"),
    checkEnv("ABRAXAS_SIGNING_KEY_ID"),
    checkEnv("ABRAXAS_PORTABLE_REVOCATION_PUBLISHER_URL", false),
    checkEnv("ABRAXAS_PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS", false),
    checkEnv("ABRAXAS_PORTABLE_REVOCATION_CHECKPOINT_DIR", false),
    checkTable("passport_reusable_credentials"),
    checkTable("passport_institutional_presentation_consents"),
    checkTable("passport_institutional_authorization_commits"),
    checkTable("partner_policies"),
  ];

  const report = {
    database: pgUrl ? pgUrl.replace(/:[^:@/]+@/, ":***@") : null,
    checks,
    ok: checks.every((c) => c.ok),
  };
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main();
