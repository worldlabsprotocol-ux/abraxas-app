#!/usr/bin/env npx tsx
// FILE: scripts/partner-conformance.ts
// Runnable partner conformance harness — read-only live probes + offline receipt fixtures.

import {
  formatConformanceReport,
  runPartnerConformance,
} from "@/lib/partner/partnerConformanceHarness";
import { resolvePartnerConformanceOptions } from "@/lib/partner/partnerConformanceConfig";

async function main() {
  const options = resolvePartnerConformanceOptions(process.env);

  if (options.configMissing.length > 0) {
    console.error(
      "Missing required environment variables:",
      options.configMissing.join(", "),
    );
    console.error("");
    console.error("Example:");
    console.error(
      "  PARTNER_FLOW_RP_PARTNER_ID=your-protocol-partner \\",
    );
    console.error(
      "  PARTNER_FLOW_RP_POLICY_ID=your-protocol-policy-v1 \\",
    );
    console.error(
      "  PARTNER_FLOW_RP_RETURN_URL=https://your-app.example.com/auth/abraxas/callback \\",
    );
    console.error(
      "  PARTNER_FLOW_RP_BASE_URL=https://abraxasworld.xyz \\",
    );
    console.error("  npm run partner:conformance");
    process.exit(1);
  }

  const result = await runPartnerConformance(options, { fetch });
  console.log(formatConformanceReport(result));

  if (result.exitCode !== 0) {
    process.exit(result.exitCode);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
