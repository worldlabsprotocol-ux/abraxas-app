// FILE: scripts/build966/run-acceptance.ts
// BUILD #966 — executable acceptance bundle (offline verifier + hosted ops).

import { execSync } from "node:child_process";

const steps: Array<{ name: string; cmd: string }> = [
  {
    name: "plain summary",
    cmd: "npx vitest run lib/partner/portableIndependentVerification/plainVerificationSummary.test.ts",
  },
  {
    name: "verification-first fixtures",
    cmd: "npx vitest run lib/partner/portableIndependentVerification/integrationFirstDemonstration.test.ts",
  },
  {
    name: "integration-first-821",
    cmd: "npm run test:integration-first-821",
  },
  {
    name: "build963 adoption proof",
    cmd: "npm run build963:verification-first-adoption-proof",
  },
  {
    name: "synthetic bundle route",
    cmd: "npx vitest run app/api/developers/verification-first/synthetic-bundle/route.test.ts",
  },
  {
    name: "synthetic bundle download",
    cmd: "npx tsx scripts/build966/verify-synthetic-bundle-download.ts",
  },
  {
    name: "verifier external install",
    cmd: "npm run build831:pack-verifier && bash scripts/build831/prove-external-install.sh",
  },
];

if (process.env.BUILD966_POST_MERGE === "1") {
  steps.push({
    name: "production apex assert",
    cmd: "bash scripts/operations/assert-production-apex-sha.sh",
  });
}

function main() {
  const failures: string[] = [];
  for (const step of steps) {
    process.stdout.write(`\n## ${step.name}\n`);
    try {
      execSync(step.cmd, { stdio: "inherit", cwd: process.cwd() });
    } catch {
      failures.push(step.name);
    }
  }
  if (failures.length) {
    console.error(`\nBUILD #966 acceptance FAIL: ${failures.join(", ")}`);
    process.exit(1);
  }
  console.log("\nBUILD #966 acceptance PASS (automated bundle)");
}

main();