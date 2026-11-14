#!/usr/bin/env node
/**
 * Non-production governance operator ceremony checklist. Does not install Production custody.
 */
import { join } from "node:path";
import { GOVERNANCE_PIN_CUSTODY } from "@/lib/persistence/boundary/issuerAuthority/governanceApproval";
import { LIVE_AWS_KMS_REQUIRED_ENV_VARS } from "@/lib/institutional/signing/awsKmsLiveTestEnv";
import { INSTITUTIONAL_WORKER_ENV_FLAG } from "@/lib/institutional/signing/custodyImplementation";

const steps = [
  "Generate governance Ed25519 key pair on operator-controlled hardware (not receipt runtime, not institutional worker).",
  "Conduct out-of-band witness ceremony; record authorizedWitnessSha256 separately from issuer environment.",
  "Connect as abraxas_governance_operator (ABRAXAS_GOVERNANCE_OPERATOR_PG_URL) — not runtime or worker credentials.",
  "establishGovernanceTrustPin with signed bootstrap + witness; verify runtime SELECT-only on pin.",
  "Confirm issuer cannot call establishGovernanceTrustPin without operator DB URL.",
  "Document succession (rotateEstablishedGovernancePin) and distrust (no silent reinstall).",
  `Never set ${INSTITUTIONAL_WORKER_ENV_FLAG}=1 or institutional KMS credentials on governance workstation if it is also the receipt app.`,
  "Recovery: distrust persists; no in-app governance key recovery (see GOVERNANCE_PIN_CUSTODY.recovery).",
];

console.log("# Abraxas governance operator ceremony (non-production)\n");
console.log("## Custody model\n");
console.log(GOVERNANCE_PIN_CUSTODY.holder);
console.log("\n## Initial pin\n");
console.log(GOVERNANCE_PIN_CUSTODY.initialPin);
console.log("\n## Approval procedure\n");
console.log(GOVERNANCE_PIN_CUSTODY.approvalProcedure);
console.log("\n## Operator checklist\n");
for (const [index, step] of steps.entries()) {
  console.log(`${index + 1}. ${step}`);
}
console.log("\n## Disposable proof command\n");
console.log("ABRAXAS_SOVEREIGN_OPERATIONAL_PROOF=1 npx vitest run --sequence.concurrent=false \\");
console.log("  lib/persistence/boundary/issuerAuthority/governanceOperatorIsolation.test.ts \\");
console.log("  lib/persistence/boundary/issuerAuthority/governanceTrustPin.test.ts\n");
console.log("## Institutional custody (optional, separate from governance)\n");
console.log("AWS KMS is optional. For AWS-free NP demo use:");
console.log("  ABRAXAS_INSTITUTIONAL_CUSTODY_PROVIDER=self-hosted-file");
console.log("  ABRAXAS_SELF_HOSTED_ISSUER_SEED_PATH, ABRAXAS_SELF_HOSTED_STATUS_SEED_PATH");
console.log("Or ABRAXAS_INSTITUTIONAL_WORKER_DEMO_MEMORY=1 for disposable demo keys.\n");
console.log("AWS KMS env (when using aws-kms provider):");
console.log(LIVE_AWS_KMS_REQUIRED_ENV_VARS.join(", "));
console.log("\n## Recovery limitations\n");
console.log(GOVERNANCE_PIN_CUSTODY.recovery);
console.log("\n## Evidence artifact\n");
const custodyPath = join(process.cwd(), "lib/persistence/boundary/issuerAuthority/governanceApproval.ts");
console.log(`Source of truth: ${custodyPath} (GOVERNANCE_PIN_CUSTODY)\n`);
if (process.env.ABRAXAS_SOVEREIGN_OPERATIONAL_PROOF === "1") {
  console.log("(Checklist only — run vitest commands above on a host with disposable Postgres.)");
}
