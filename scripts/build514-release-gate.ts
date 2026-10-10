#!/usr/bin/env npx tsx
/**
 * Build #514 release gate — read-only safety + local preflight (no secrets printed).
 * Remote Demo schema checks: run separately via authorized Supabase tooling; see docs/BUILD_514_ACCEPTANCE_MATRIX.json
 */
import { writeFileSync } from "fs";
import { resolve } from "path";
import { execSync } from "child_process";
import { assertDemoSupabaseNotProduction } from "@/lib/release/demoEnvironmentSafety";
import { runSolanaNativeDemoPreflight, formatSolanaNativeDemoPreflightReport } from "@/lib/integration/solanaNativeDemoPreflight";

const ROOT = resolve(__dirname, "..");

function gitSha(): string {
  try {
    return execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

async function main() {
  const sha = gitSha();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const safety = assertDemoSupabaseNotProduction({ supabaseUrl: url });

  console.log("=== Build #514 release gate ===");
  console.log(`commit=${sha}`);
  console.log(`demo_safety=${safety.verdict} ${safety.message}`);

  if (safety.isProductionRef) {
    console.error("\nSTOP-SHIP: production Supabase binding detected.");
    process.exit(3);
  }

  const preflight = await runSolanaNativeDemoPreflight({ env: process.env });
  console.log("\n--- Solana demo preflight ---");
  console.log(formatSolanaNativeDemoPreflightReport(preflight));

  const outPath = resolve(ROOT, "docs/BUILD_514_PREFLIGHT_LAST_RUN.txt");
  writeFileSync(
    outPath,
    [`commit=${sha}`, `timestamp=${new Date().toISOString()}`, safety.message, "", formatSolanaNativeDemoPreflightReport(preflight)].join("\n"),
    "utf8",
  );
  console.log(`\nWrote ${outPath}`);

  process.exit(preflight.exitCode === 0 && safety.verdict === "pass" ? 0 : preflight.exitCode || 1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
