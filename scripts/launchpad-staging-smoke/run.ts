#!/usr/bin/env npx tsx
// FILE: scripts/launchpad-staging-smoke/run.ts
//
// Partner Launchpad staging smoke test against an explicit Vercel preview.
//
// Required:
//   LAUNCHPAD_STAGING_URL=https://your-preview.vercel.app
//   LAUNCHPAD_EXPECTED_SUPABASE_REF=ocntwbxarpjeixdnzide
//
// Optional:
//   VERCEL_PROTECTION_BYPASS=...   Vercel deployment protection bypass token
//   LAUNCHPAD_ADMIN_PIN=...        Admin PIN for production approval steps
//   PLAYWRIGHT_STORAGE_STATE=...   Saved browser auth state after operator SSO login

import { parseStagingTargetFromEnv } from "./guards";
import { executeStagingSmoke } from "./walkthrough";

async function main() {
  const config = parseStagingTargetFromEnv();
  const { report } = await executeStagingSmoke(config);
  process.exit(report.overallVerdict === "PASS" ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
