#!/usr/bin/env npx tsx
/**
 * Build #557 — sovereign institutional activation gate (schema + env + certification).
 * Synthetic IDV in certification suites only — not Production human verification.
 */
import { execFileSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { validateInstitutionalSovereignEnv } from "../../lib/sovereignRuntime/institutionalActivationEnv";

const env = { ...process.env };
const t0 = performance.now();

const envReport = validateInstitutionalSovereignEnv(env);
if (!envReport.ok) {
  console.error(JSON.stringify({ build: 557, activation: "BLOCKED", env: envReport }, null, 2));
  process.exit(1);
}

execFileSync("npm", ["run", "sovereign-idv:apply-schema"], {
  stdio: "inherit",
  env,
});

let certification: { ok: boolean; detail?: unknown } = { ok: false };
try {
  execFileSync("npm", ["run", "sovereign-runtime:certify-556"], { stdio: "inherit", env });
  certification = { ok: true };
} catch (error) {
  certification = {
    ok: false,
    detail: error instanceof Error ? error.message : String(error),
  };
}

let disposableProof: { ok: boolean } = { ok: false };
try {
  execFileSync("npm", ["run", "sovereign-runtime:disposable-proof"], {
    stdio: "inherit",
    env: {
      ...env,
      NEXT_PUBLIC_SUPABASE_URL: "",
      SUPABASE_URL: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
    },
  });
  disposableProof = { ok: true };
} catch (error) {
  disposableProof = {
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  } as { ok: boolean; error?: string };
}

const activationOk =
  envReport.ok
  && (disposableProof as { ok?: boolean }).ok === true
  && certification.ok;

console.log(
  JSON.stringify(
    {
      build: 557,
      activation: activationOk ? "READY" : "BLOCKED",
      elapsed_ms: Math.round(performance.now() - t0),
      env: envReport,
      schema_applied: true,
      certification,
      disposable_proof: disposableProof,
      note: "Synthetic IDV in certification — not genuine human verification.",
    },
    null,
    2,
  ),
);

process.exit(activationOk ? 0 : 1);
