#!/usr/bin/env npx tsx
/** Machine-readable Solana mainnet promotion gate (read-only). */

import { writeFileSync } from "node:fs";
import { evaluateSolanaMainnetPromotionGate } from "@/lib/institutional/solanaMainnetPromotionGate";

const report = evaluateSolanaMainnetPromotionGate({
  deployment_registry_integrity_ok: Boolean(process.env.ABRAXAS_ONCHAIN_REGISTRY_VERIFIED === "true"),
  verified_program_id_match: Boolean(process.env.ABRAXAS_SOLANA_ELF_DIGEST_VERIFIED === "true"),
  upgrade_authority_documented: Boolean(process.env.ABRAXAS_SOLANA_UPGRADE_AUTH_DOCUMENTED === "true"),
  signer_active: Boolean(process.env.ABRAXAS_CHAIN_ATTESTATION_SIGNER_ACTIVE === "true"),
  signer_rotation_documented: Boolean(process.env.ABRAXAS_CHAIN_SIGNER_ROTATION_DOCUMENTED === "true"),
  rpc_url_configured: Boolean(process.env.ABRAXAS_SOLANA_GATE_VERIFY_RPC_URL?.trim()),
  rpc_is_devnet: (process.env.ABRAXAS_SOLANA_GATE_VERIFY_RPC_URL ?? "").includes("devnet"),
  independent_observation_present: Boolean(process.env.ABRAXAS_SOLANA_OBSERVATION_PRESENT === "true"),
  receipt_commitment_consistency_ok: Boolean(process.env.ABRAXAS_RECEIPT_COMMITMENT_CONSISTENCY === "true"),
  conformance_vectors_pass: Boolean(process.env.ABRAXAS_CONFORMANCE_VECTORS_PASS === "true"),
});

console.log(JSON.stringify(report, null, 2));
writeFileSync("/opt/cursor/artifacts/solana-mainnet-promotion-gate.json", JSON.stringify(report, null, 2));
process.exit(report.overall === "PASS" ? 0 : 2);
