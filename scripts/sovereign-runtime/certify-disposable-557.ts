#!/usr/bin/env npx tsx
/**
 * Disposable sovereign certification — synthetic IDV only, not Production readiness.
 */
import { execFileSync } from "node:child_process";
import { validateDisposableCertificationEnv } from "../../lib/sovereignRuntime/sovereignActivationPolicy";

const env = process.env;
const gate = validateDisposableCertificationEnv(env);
if (!gate.ok) {
  console.error(JSON.stringify({ tier: "BLOCKED", disposable: gate }, null, 2));
  process.exit(1);
}

execFileSync("npm", ["run", "sovereign-runtime:certify-556"], {
  stdio: "inherit",
  env,
});

console.log(
  JSON.stringify(
    {
      build: 557,
      tier: "DISPOSABLE_CERTIFIED",
      note: "Synthetic IDV certification only — does not establish INSTITUTIONAL_READY or Production verification.",
    },
    null,
    2,
  ),
);
