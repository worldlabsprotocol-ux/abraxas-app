// FILE: lib/partner/universalIntegration/readinessEvidenceMatrix.ts

export type ReadinessEvidenceTier =
  | "offline_contract_proof"
  | "live_sandbox_infrastructure"
  | "live_sandbox_receipt"
  | "production_validation";

export interface ReadinessEvidenceRow {
  tier: ReadinessEvidenceTier;
  label: string;
  command_or_api: string;
  proves: string;
  does_not_prove: string;
}

export const READINESS_EVIDENCE_MATRIX: ReadinessEvidenceRow[] = [
  {
    tier: "offline_contract_proof",
    label: "Offline contract proof",
    command_or_api: "vitest universalIntegration + npm run partner:universal-readiness",
    proves: "Receipt trust fail-closed fixtures, URL builders, PII stripping",
    does_not_prove: "Live holder flow or signed receipt from staging",
  },
  {
    tier: "live_sandbox_infrastructure",
    label: "Live sandbox infrastructure",
    command_or_api: "npm run partner:live-sandbox (without receipt id)",
    proves: "Compatibility manifest + hosted verify entry reachable",
    does_not_prove: "Policy evaluation or receipt issuance",
  },
  {
    tier: "live_sandbox_receipt",
    label: "Live sandbox receipt verification",
    command_or_api: "EXAMPLE_MERCHANT_LIVE_RECEIPT_ID=dr_… npm run partner:live-sandbox",
    proves: "Public receipt fetch + server-side trust validation for real issued receipt",
    does_not_prove: "Production activation or regulated checkout",
  },
  {
    tier: "production_validation",
    label: "Production validation",
    command_or_api: "Launchpad production activation + production credentials",
    proves: "Reviewed production access with production-scoped trust mode",
    does_not_prove: "Merchant checkout wiring (relying-party responsibility)",
  },
];
