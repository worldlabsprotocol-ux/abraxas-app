#!/usr/bin/env npx tsx
/**
 * Build #818/#819 — standalone relying-party verifier CLI.
 * Imports only @abraxas/independent-verifier (not Abraxas app backend modules).
 */

import { readFileSync } from "node:fs";
import {
  verifyAbraxasReceiptIndependently,
  type DecisionReceiptRecord,
  type SignedIssuerAuthorityStatement,
  type SignedReceiptStatusStatement,
  type TrustAnchorBundleV1,
} from "../../packages/abraxas-independent-verifier/src/index";

async function main() {
  const [receiptPath, anchorPath, statementPath, signedStatusPath] = process.argv.slice(2);
  const partnerId = process.env.RP_PARTNER_ID?.trim();
  const policyId = process.env.RP_POLICY_ID?.trim();
  const environment = (process.env.RP_ENVIRONMENT?.trim() || "production") as "demo" | "production";
  const minStatusVersion = process.env.RP_MIN_STATUS_VERSION?.trim();
  if (!receiptPath || !anchorPath || !statementPath || !signedStatusPath || !partnerId || !policyId) {
    console.error(
      "Usage: RP_PARTNER_ID=… RP_POLICY_ID=… [RP_ENVIRONMENT=production|demo] "
      + "[RP_MIN_STATUS_VERSION=n] npx tsx verify.ts receipt.json trust-anchor-bundle.json "
      + "issuer-authority.json signed-status-statement.json",
    );
    process.exit(2);
  }

  const record = JSON.parse(readFileSync(receiptPath, "utf8")) as DecisionReceiptRecord;
  const pinnedTrustAnchor = JSON.parse(readFileSync(anchorPath, "utf8")) as TrustAnchorBundleV1;
  const signedIssuerAuthority = JSON.parse(readFileSync(statementPath, "utf8")) as SignedIssuerAuthorityStatement;
  const signedStatusStatement = JSON.parse(readFileSync(signedStatusPath, "utf8")) as SignedReceiptStatusStatement;

  const result = verifyAbraxasReceiptIndependently({
    record,
    pinnedTrustAnchor,
    signedIssuerAuthority,
    relyingParty: { partner_id: partnerId, policy_id: policyId, environment },
    statementObservedAt: new Date().toISOString(),
    signedStatusStatement,
    minimumStatusVersion: minStatusVersion ? Number(minStatusVersion) : undefined,
  });

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.currently_acceptable === "yes" ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
