#!/usr/bin/env npx tsx
/**
 * Build #586 — third-party backend verification example.
 * Uses the supported institutional verification SDK (no duplicated crypto).
 *
 * Required env (operator machine only — never commit):
 *   ABRAXAS_RECEIPT_VERIFICATION_REGISTRY — JSON array of public receipt verification keys
 *   ABRAXAS_PORTABLE_REVOCATION_ISSUER_TRUST — optional for holder presentation path
 *
 * Optional:
 *   ABRAXAS_TRUST_ORIGIN — fetch keys with digest pin
 *   ABRAXAS_RECEIPT_KEY_DOCUMENT_DIGEST — pin for network bootstrap
 */

import { readFileSync } from "node:fs";
import {
  resolveInstitutionalTrustEnv,
  verifySignedDecisionReceipt,
  type InstitutionalReceiptVerificationResult,
} from "../../lib/institutionalVerification";
import type { DecisionReceiptRecord } from "../../lib/decisionReceipts/types";

async function main() {
  const receiptPath = process.argv[2];
  const partnerId = process.env.RP_PARTNER_ID?.trim();
  const policyId = process.env.RP_POLICY_ID?.trim();
  if (!receiptPath || !partnerId || !policyId) {
    console.error("Usage: RP_PARTNER_ID=… RP_POLICY_ID=… npx tsx verify.ts signed-receipt.json");
    process.exit(2);
  }

  const signed_record = JSON.parse(readFileSync(receiptPath, "utf8")) as DecisionReceiptRecord;

  const trust = await resolveInstitutionalTrustEnv({
    receipt_verification_registry_json: process.env.ABRAXAS_RECEIPT_VERIFICATION_REGISTRY,
    trust_origin_url: process.env.ABRAXAS_TRUST_ORIGIN,
    pinned_receipt_key_document_digest: process.env.ABRAXAS_RECEIPT_KEY_DOCUMENT_DIGEST,
    portable_revocation_issuer_trust_json: process.env.ABRAXAS_PORTABLE_REVOCATION_ISSUER_TRUST,
  });

  if (!trust.ok) {
    console.error(JSON.stringify({ ok: false, stage: "trust_configuration", code: trust.code }, null, 2));
    process.exit(1);
  }

  const result: InstitutionalReceiptVerificationResult = await verifySignedDecisionReceipt({
    signed_record,
    relying_party: { partner_id: partnerId, policy_id: policyId },
    request_id: `example_${Date.now()}`,
    trust_env: trust.env,
    revocation_source: { available: true, status: "active" },
    enforce_single_use: false,
  });

  const output = {
    ok: result.authorize,
    contract_version: result.contract_version,
    verdict: result.verdict,
    rejection_reasons: result.rejection_reasons,
    detail_codes: result.detail_codes,
    offline_checks_completed: result.offline_checks_completed,
    identity_database_required: result.identity_database_required,
  };

  console.log(JSON.stringify(output, null, 2));
  process.exit(result.authorize ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
