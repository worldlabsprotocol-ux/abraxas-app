#!/usr/bin/env npx tsx
/**
 * Build #586 — third-party backend verification example (safe defaults).
 *
 * Cryptographic inspection is separate from authorization. This script fails closed
 * when production replay or revocation configuration is incomplete.
 */

import { readFileSync } from "node:fs";
import {
  resolveInstitutionalTrustEnv,
  verifySignedDecisionReceipt,
  inspectSignedDecisionReceipt,
  type InstitutionalReceiptVerificationResult,
} from "../../lib/institutionalVerification";
import { FileReceiptConsumptionStore } from "../../lib/institutionalCertification/build547/receiptConsumptionStore";
import type { DecisionReceiptRecord } from "../../lib/decisionReceipts/types";
import type { RevocationSourceState } from "../../lib/institutionalCertification/build546/independentVerifier";

function loadRevocationFeed(): RevocationSourceState | null {
  const inline = process.env.RP_REVOCATION_FEED_JSON?.trim();
  const path = process.env.RP_REVOCATION_FEED_PATH?.trim();
  const raw = inline ?? (path ? readFileSync(path, "utf8") : "");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RevocationSourceState;
  } catch {
    return null;
  }
}

async function main() {
  const receiptPath = process.argv[2];
  const partnerId = process.env.RP_PARTNER_ID?.trim();
  const policyId = process.env.RP_POLICY_ID?.trim();
  const mode = (process.env.RP_VERIFY_MODE?.trim() || "authorize").toLowerCase();
  if (!receiptPath || !partnerId || !policyId) {
    console.error(
      "Usage: RP_PARTNER_ID=… RP_POLICY_ID=… [RP_CONSUMPTION_DIR=…] npx tsx verify.ts signed-receipt.json",
    );
    process.exit(2);
  }

  const signed_record = JSON.parse(readFileSync(receiptPath, "utf8")) as DecisionReceiptRecord;

  const trust = await resolveInstitutionalTrustEnv({
    receipt_verification_registry_json: process.env.ABRAXAS_RECEIPT_VERIFICATION_REGISTRY,
    trust_origin_url: process.env.ABRAXAS_TRUST_ORIGIN,
    pinned_receipt_key_document_digest: process.env.ABRAXAS_RECEIPT_KEY_DOCUMENT_DIGEST,
  });

  if (!trust.ok) {
    console.error(JSON.stringify({ ok: false, stage: "trust_configuration", code: trust.code }, null, 2));
    process.exit(1);
  }

  if (mode === "inspect") {
    const inspected: InstitutionalReceiptVerificationResult = await inspectSignedDecisionReceipt({
      signed_record,
      relying_party: { partner_id: partnerId, policy_id: policyId },
      request_id: `example_inspect_${Date.now()}`,
      trust_env: trust.env,
    });
    console.log(
      JSON.stringify(
        {
          ok: inspected.verdict === "valid",
          mode: "inspect_only",
          authorize: false,
          cryptographically_valid: inspected.underlying.cryptographically_authentic,
          contract_version: inspected.contract_version,
          verdict: inspected.verdict,
          rejection_reasons: inspected.rejection_reasons,
          note: "Inspection never grants access. Configure RP_CONSUMPTION_DIR and RP_REVOCATION_FEED_JSON for authorize.",
        },
        null,
        2,
      ),
    );
    process.exit(inspected.verdict === "valid" ? 0 : 1);
  }

  const consumptionDir = process.env.RP_CONSUMPTION_DIR?.trim();
  if (!consumptionDir) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          stage: "durable_replay_store",
          code: "durable_store_required",
          detail: "Set RP_CONSUMPTION_DIR to a persistent directory for single-use authorization.",
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  const revocationSource = loadRevocationFeed();
  if (!revocationSource) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          stage: "revocation_material",
          code: "revocation_unavailable",
          detail:
            "Set RP_REVOCATION_FEED_JSON or RP_REVOCATION_FEED_PATH with your institution-operated revocation feed.",
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  const consumptionStore = new FileReceiptConsumptionStore(consumptionDir);

  const result: InstitutionalReceiptVerificationResult = await verifySignedDecisionReceipt({
    signed_record,
    relying_party: { partner_id: partnerId, policy_id: policyId },
    request_id: `example_${Date.now()}`,
    trust_env: trust.env,
    consumption_store: consumptionStore,
    revocation_source: revocationSource,
  });

  console.log(
    JSON.stringify(
      {
        ok: result.authorize,
        mode: "authorize",
        contract_version: result.contract_version,
        verdict: result.verdict,
        rejection_reasons: result.rejection_reasons,
        detail_codes: result.detail_codes,
        note: "Signature validation alone is not sufficient — revocation feed and durable replay are required.",
      },
      null,
      2,
    ),
  );
  process.exit(result.authorize ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
