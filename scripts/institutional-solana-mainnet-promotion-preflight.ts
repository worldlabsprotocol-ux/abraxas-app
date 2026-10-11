#!/usr/bin/env npx tsx
/** Machine-readable Solana mainnet promotion gate (read-only). */

import { writeFileSync } from "node:fs";
import { evaluateSolanaMainnetPromotionGate } from "@/lib/institutional/solanaMainnetPromotionGate";
import {
  mapGovernanceReportToPromotionInputs,
  runSolanaMainnetGovernanceVerification,
} from "@/lib/institutional/solanaMainnetGovernanceVerifier";

async function main() {
  const governance = await runSolanaMainnetGovernanceVerification({
    signerRotationDocumented: Boolean(process.env.ABRAXAS_CHAIN_SIGNER_ROTATION_DOCUMENTED === "true"),
    signerCustodyDocumented: Boolean(process.env.ABRAXAS_CHAIN_ATTESTATION_SIGNER_ACTIVE === "true"),
    finalizedConfirmationPolicyDocumented: true,
  });

  const promotion = evaluateSolanaMainnetPromotionGate({
    ...mapGovernanceReportToPromotionInputs(governance),
    conformance_vectors_pass: Boolean(process.env.ABRAXAS_CONFORMANCE_VECTORS_PASS === "true"),
  });

  const bundle = { governance, promotion };

  console.log(JSON.stringify(bundle, null, 2));
  writeFileSync("/opt/cursor/artifacts/solana-mainnet-promotion-gate.json", JSON.stringify(bundle, null, 2));
  process.exit(promotion.overall === "PASS" && governance.overall === "PASS" ? 0 : 2);
}

void main();
