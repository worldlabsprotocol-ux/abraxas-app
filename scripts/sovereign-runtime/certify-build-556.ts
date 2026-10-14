#!/usr/bin/env npx tsx
/**
 * Build #556 certification runner — disposable PostgreSQL, no Supabase env required.
 */
import { execFileSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { generateTestSigningKeyPair } from "../../lib/decisionReceipts/signing";
import { validateDisposableCertificationEnv } from "../../lib/sovereignRuntime/sovereignActivationPolicy";

const PG = process.env.ABRAXAS_SOVEREIGN_PG_URL?.trim()
  || process.env.ABRAXAS_DATABASE_URL?.trim();
const RESTORE = process.env.ABRAXAS_SOVEREIGN_RESTORE_PG_URL?.trim()
  || process.env.ABRAXAS_RESTORE_DATABASE_URL?.trim();

const CERT_SIGNING_KEY =
  process.env.ABRAXAS_SIGNING_KEY?.trim()
  || JSON.stringify(generateTestSigningKeyPair().privateKeyJwk);

function runVitest(pattern: string): { ok: boolean; ms: number } {
  const t0 = performance.now();
  try {
    execFileSync(
      "./node_modules/.bin/vitest",
      ["run", ...pattern.split(/\s+/).filter(Boolean)],
      {
        stdio: "inherit",
        env: {
          ...process.env,
          ABRAXAS_PERSISTENCE_BACKEND: "postgres_direct",
          ABRAXAS_DATABASE_URL: PG,
          ABRAXAS_SOVEREIGN_PG_URL: PG,
          ABRAXAS_SOVEREIGN_RESTORE_PG_URL: RESTORE,
          ABRAXAS_RESTORE_DATABASE_URL: RESTORE,
          ABRAXAS_SIGNING_KEY: CERT_SIGNING_KEY,
          ABRAXAS_EVIDENCE_ENCRYPTION_KEY:
            process.env.ABRAXAS_EVIDENCE_ENCRYPTION_KEY
            || Buffer.alloc(32, 56).toString("base64"),
          NEXT_PUBLIC_SUPABASE_URL: "",
          SUPABASE_URL: "",
          SUPABASE_SERVICE_ROLE_KEY: "",
        },
      },
    );
    return { ok: true, ms: Math.round(performance.now() - t0) };
  } catch {
    return { ok: false, ms: Math.round(performance.now() - t0) };
  }
}

async function main(): Promise<void> {
  if (!PG) {
    console.error("Set ABRAXAS_SOVEREIGN_PG_URL or ABRAXAS_DATABASE_URL");
    process.exit(1);
  }

  const gate = validateDisposableCertificationEnv(process.env);
  if (!gate.ok) {
    console.error(JSON.stringify({ certification: "FAIL", disposable: gate }, null, 2));
    process.exit(1);
  }

  execFileSync("npm", ["run", "sovereign-idv:apply-schema"], {
    stdio: "inherit",
    env: { ...process.env, ABRAXAS_DATABASE_URL: PG, ABRAXAS_SOVEREIGN_PG_URL: PG },
  });

  const suites = [
    "lib/persistence/build556.sovereignCertification.test.ts",
    "lib/databaseRecovery/manifestGuard.sovereign.test.ts",
    ...(RESTORE ? ["lib/databaseRecovery/sovereignBackupRestore.test.ts"] : []),
    "lib/persistence/build555Security.adversarial.test.ts",
    "lib/persistence/holderSubjectDirect.concurrency.test.ts",
  ];

  const results: Record<string, { ok: boolean; ms: number }> = {};
  for (const s of suites) {
    results[s] = runVitest(s);
  }

  const allOk = Object.values(results).every((r) => r.ok);
  console.log(JSON.stringify({
    build: 556,
    tier: allOk ? "DISPOSABLE_CERTIFIED" : "BLOCKED",
    certification: allOk ? "PASS" : "FAIL",
    postgres_direct: true,
    supabase_env_cleared: true,
    restore_url_configured: Boolean(RESTORE),
    suites: results,
    note: "Synthetic IDV fixtures — not genuine human verification.",
  }, null, 2));

  process.exit(allOk ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
