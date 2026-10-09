#!/usr/bin/env npx tsx
/**
 * Colosseum acceptance probe (read-only).
 * - Live canonical verifier on historical receipt (expect Deny)
 * - Trust slice from public GET
 * - Deployment fingerprint hint via Launchpad health (requires session cookie — skipped here)
 *
 * Run:
 *   npx tsx scripts/good-trouble-colosseum-acceptance.ts
 *   GOOD_TROUBLE_RECEIPT_ID=dr_... ABRAXAS_BASE_URL=https://abraxasworld.xyz npx tsx scripts/good-trouble-colosseum-acceptance.ts
 */

import {
  receiptTrustMatchesColosseumSandbox,
  verifyLiveReceiptWithCanonicalSandboxVerifier,
} from "@/lib/goodTrouble/colosseumAcceptance";
import {
  GOOD_TROUBLE_SANDBOX_RECEIPT_TRUST_MERGE_SHA,
} from "@/lib/partner/launchpad/deploymentFingerprint";

const HISTORICAL_RECEIPT = process.env.GOOD_TROUBLE_RECEIPT_ID?.trim() ?? "dr_FQzqHIutAUA8iNAw";
const BASE = process.env.ABRAXAS_BASE_URL?.trim() ?? "https://abraxasworld.xyz";

async function main() {
  const live = await verifyLiveReceiptWithCanonicalSandboxVerifier({
    receiptId: HISTORICAL_RECEIPT,
    baseUrl: BASE,
  });

  const trustErrors = live.trustSlice
    ? receiptTrustMatchesColosseumSandbox(live.trustSlice)
    : ["public_receipt_unavailable"];

  console.log(JSON.stringify({
    label: "good_trouble_colosseum_acceptance_probe",
    base_url: BASE,
    receipt_trust_merge_sha_expected_prefix: GOOD_TROUBLE_SANDBOX_RECEIPT_TRUST_MERGE_SHA.slice(0, 7),
    historical_receipt: {
      id: HISTORICAL_RECEIPT,
      note: "Do not mutate. Issued before sandbox receipt-trust deploy may stay production-labeled.",
      verifier_action: live.action,
      verifier_errors: live.errors,
      public_trust: live.trustSlice
        ? {
          decision_context: live.trustSlice.decision_context,
          production_usable: live.trustSlice.production_usable,
          currently_valid: live.trustSlice.currently_valid,
          colosseum_trust_errors: trustErrors,
        }
        : null,
    },
    new_seeker_receipt_acceptance: {
      required_public_fields: {
        decision_context: "sandbox_only",
        production_usable: false,
        currently_valid: true,
      },
      verifier: "verifyGoodTroubleSandboxAccess → permit",
      deploy_gate: `Production must include merge ${GOOD_TROUBLE_SANDBOX_RECEIPT_TRUST_MERGE_SHA.slice(0, 12)}… (PR #595)`,
    },
    founder_network_capture: {
      instruction: "DevTools → Network → POST …/hosted-handoff → copy Status and Response JSON fields ok/code/error only",
      never_share: ["cookies", "Set-Cookie", "Authorization", "api keys"],
    },
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
