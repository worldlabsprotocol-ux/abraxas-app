#!/usr/bin/env tsx
// FILE: scripts/hospitality-portability-proof.ts
// Offline proof: Cielo + synthetic rental operator B share adapter machinery with tenant isolation.

import { runHospitalityPortabilityProof } from "@/lib/partner/hospitality/hospitalityPortabilityProof";

const result = runHospitalityPortabilityProof();

console.log("=== Hospitality rental operator portability (Build #502) ===\n");
for (const step of result.steps) {
  console.log(`[${step.outcome}] ${step.id} (${step.tenant}): ${step.detail.slice(0, 120)}${step.detail.length > 120 ? "…" : ""}`);
}
console.log("\nTenant isolation:", result.tenant_isolation);
console.log(`\nOverall: ${result.allPassed ? "pass" : "fail"}`);
process.exit(result.allPassed ? 0 : 1);
