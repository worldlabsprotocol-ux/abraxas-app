#!/usr/bin/env npx tsx
/**
 * Redacted staging ownership report — never prints secrets.
 */
import {
  buildStagingOperationalOwnershipChecklist,
  evaluateExternalStagingDeployment,
} from "@/lib/persistence/boundary/staging/stagingOperationalOwnership";

const checklist = buildStagingOperationalOwnershipChecklist(process.env);
const external = evaluateExternalStagingDeployment(process.env);

console.log(JSON.stringify({ external, checklist }, null, 2));

const failed = checklist.filter((c) => !c.satisfied);
if (failed.length) {
  process.exitCode = 1;
}
