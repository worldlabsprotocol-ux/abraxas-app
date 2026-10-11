#!/usr/bin/env npx tsx
/** Reference integration example for unaffiliated engineering teams (no live credentials). */

import { runInstitutionalIntegrationHarness } from "@/lib/institutional/integration/institutionalIntegrationHarness";
import { getInstitutionalIntegrationContract } from "@/lib/institutional/integration/institutionalIntegrationContract";

async function main() {
  const contract = getInstitutionalIntegrationContract();
  const report = await runInstitutionalIntegrationHarness({ includeDurableReplayProof: false });
  console.log(JSON.stringify({ contract_version: contract.version, report }, null, 2));
  process.exit(report.all_ok ? 0 : 1);
}

void main();
