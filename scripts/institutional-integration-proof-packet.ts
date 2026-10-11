#!/usr/bin/env npx tsx
/** Build #526 — sanitized integration proof packet. */

import { writeFileSync, mkdirSync } from "node:fs";
import { buildIntegrationProofPacket } from "@/lib/institutional/sandbox/integrationProofPacket";

const OUT = "/opt/cursor/artifacts/institutional-sandbox-proof-packet.json";

async function main() {
  mkdirSync("/opt/cursor/artifacts", { recursive: true });
  const packet = await buildIntegrationProofPacket();
  writeFileSync(OUT, JSON.stringify(packet, null, 2));
  console.log(JSON.stringify({ overall: packet.onboarding_decision, blockers: packet.remaining_blockers.length }, null, 2));
  console.log(`Wrote ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
