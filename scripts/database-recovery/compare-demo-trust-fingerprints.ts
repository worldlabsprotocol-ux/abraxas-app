#!/usr/bin/env npx tsx
// FILE: scripts/database-recovery/compare-demo-trust-fingerprints.ts
// Compare source baseline JSON to post-restore verify-demo-trust-slice output.

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

function loadJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function canonical(value: unknown): string {
  return JSON.stringify(value, Object.keys(value as object).sort());
}

function main(): void {
  const sourcePath = process.env.ABRAXAS_TRUST_SOURCE_JSON?.trim();
  const restoredPath = process.env.ABRAXAS_TRUST_RESTORED_JSON?.trim();
  if (!sourcePath || !restoredPath) {
    throw new Error("ABRAXAS_TRUST_SOURCE_JSON and ABRAXAS_TRUST_RESTORED_JSON are required");
  }

  const sourceRaw = loadJson(sourcePath) as Record<string, unknown>;
  const restoredWrap = loadJson(restoredPath) as { trust_slice_fingerprint?: unknown };
  const restored = restoredWrap.trust_slice_fingerprint ?? restoredWrap;

  const keys = [
    "receipt_count",
    "verification_decisions",
    "credential_claims",
    "receipt_claim_dependencies",
    "reusable_eligibility_facts",
    "reusable_eligibility_derivations",
    "decision_receipt_revocation_events",
    "decision_receipt_evidence_dependencies",
    "receipts",
  ] as const;

  const mismatches: string[] = [];
  for (const key of keys) {
    const a = canonical((sourceRaw as Record<string, unknown>)[key]);
    const b = canonical((restored as Record<string, unknown>)[key]);
    if (a !== b) mismatches.push(key);
  }

  const sourceHash = createHash("sha256").update(JSON.stringify(sourceRaw, null, 0)).digest("hex");
  const restoredHash = createHash("sha256").update(JSON.stringify(restored, null, 0)).digest("hex");

  console.log(
    JSON.stringify({
      ok: mismatches.length === 0,
      mismatches,
      source_sha256: sourceHash,
      restored_sha256: restoredHash,
    }),
  );
  if (mismatches.length > 0) process.exit(1);
}

main();
