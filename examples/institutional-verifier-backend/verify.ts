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

type InstitutionRevocationFeedEnvelope = RevocationSourceState & {
  observed_at?: string;
};

/**
 * Caller-supplied JSON is not authenticated issuer evidence. Authorization requires an
 * institution-operated adapter that records when the feed was observed and enforces freshness.
 */
function loadInstitutionRevocationFeed():
  | { ok: true; state: RevocationSourceState }
  | { ok: false; code: "adapter_required" | "feed_missing" | "freshness_config_missing" | "stale_feed" | "invalid_feed" } {
  if (process.env.RP_REVOCATION_ADAPTER?.trim() !== "institution_operated") {
    return { ok: false, code: "adapter_required" };
  }
  const inline = process.env.RP_REVOCATION_FEED_JSON?.trim();
  const path = process.env.RP_REVOCATION_FEED_PATH?.trim();
  const raw = inline ?? (path ? readFileSync(path, "utf8") : "");
  if (!raw) return { ok: false, code: "feed_missing" };
  let parsed: InstitutionRevocationFeedEnvelope;
  try {
    parsed = JSON.parse(raw) as InstitutionRevocationFeedEnvelope;
  } catch {
    return { ok: false, code: "invalid_feed" };
  }
  const maxAgeRaw = process.env.RP_REVOCATION_FEED_MAX_AGE_SECONDS?.trim();
  const maxAge = maxAgeRaw ? Number(maxAgeRaw) : NaN;
  if (!Number.isFinite(maxAge) || maxAge <= 0) {
    return { ok: false, code: "freshness_config_missing" };
  }
  const observedAtRaw =
    (typeof parsed.observed_at === "string" && parsed.observed_at.trim())
    || process.env.RP_REVOCATION_FEED_OBSERVED_AT?.trim()
    || "";
  const observedAt = observedAtRaw ? Date.parse(observedAtRaw) : NaN;
  if (!Number.isFinite(observedAt)) {
    return { ok: false, code: "freshness_config_missing" };
  }
  if (Date.now() - observedAt > maxAge * 1000) {
    return { ok: false, code: "stale_feed" };
  }
  const { observed_at: _ignored, ...state } = parsed;
  return { ok: true, state: state as RevocationSourceState };
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
          note:
            "Inspection never grants access. Authorize requires RP_REVOCATION_ADAPTER=institution_operated plus a fresh institution-operated revocation feed.",
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

  const revocationFeed = loadInstitutionRevocationFeed();
  if (!revocationFeed.ok) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          stage: "revocation_material",
          code: revocationFeed.code,
          detail:
            "Authorization requires RP_REVOCATION_ADAPTER=institution_operated, "
            + "RP_REVOCATION_FEED_MAX_AGE_SECONDS, RP_REVOCATION_FEED_OBSERVED_AT (or feed observed_at), "
            + "and JSON from your institution-operated adapter — not unauthenticated caller JSON.",
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }
  const revocationSource = revocationFeed.state;

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
