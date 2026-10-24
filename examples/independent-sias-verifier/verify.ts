#!/usr/bin/env npx tsx
/**
 * Build #818 — standalone relying-party verifier CLI.
 * Imports only @abraxas/independent-verifier (not Abraxas app backend modules).
 */

import { readFileSync } from "node:fs";
import {
  verifyAbraxasReceiptIndependently,
  type DecisionReceiptRecord,
  type ReceiptStatusEvidenceV1,
  type SignedIssuerAuthorityStatement,
  type TrustAnchorBundleV1,
} from "../../packages/abraxas-independent-verifier/src/index";

async function main() {
  const [receiptPath, anchorPath, statementPath, statusPath] = process.argv.slice(2);
  const partnerId = process.env.RP_PARTNER_ID?.trim();
  const policyId = process.env.RP_POLICY_ID?.trim();
  const environment = (process.env.RP_ENVIRONMENT?.trim() || "production") as "demo" | "production";
  if (!receiptPath || !anchorPath || !statementPath || !statusPath || !partnerId || !policyId) {
    console.error(
      "Usage: RP_PARTNER_ID=… RP_POLICY_ID=… [RP_ENVIRONMENT=production|demo] "
      + "npx tsx verify.ts receipt.json trust-anchor-bundle.json issuer-authority.json status-evidence.json",
    );
    process.exit(2);
  }

  const record = JSON.parse(readFileSync(receiptPath, "utf8")) as DecisionReceiptRecord;
  const pinnedTrustAnchor = JSON.parse(readFileSync(anchorPath, "utf8")) as TrustAnchorBundleV1;
  const signedIssuerAuthority = JSON.parse(readFileSync(statementPath, "utf8")) as SignedIssuerAuthorityStatement;
  const statusEvidence = JSON.parse(readFileSync(statusPath, "utf8")) as ReceiptStatusEvidenceV1;

  const result = verifyAbraxasReceiptIndependently({
    record,
    pinnedTrustAnchor,
    signedIssuerAuthority,
    relyingParty: { partner_id: partnerId, policy_id: policyId, environment },
    statementObservedAt: new Date().toISOString(),
    statusEvidence,
  });

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.currently_acceptable === "yes" ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
