import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  DecisionReceiptRecord,
  SignedIssuerAuthorityStatement,
  SignedReceiptStatusStatement,
  TrustAnchorBundleV1,
} from "@abraxas/independent-verifier";

const DIR = join(import.meta.dirname);

export function loadTestFixtures() {
  const trust_anchor_bundle = JSON.parse(
    readFileSync(join(DIR, "trust-anchor-bundle.json"), "utf8"),
  ) as TrustAnchorBundleV1;
  const decision_receipt = JSON.parse(
    readFileSync(join(DIR, "decision-receipt.json"), "utf8"),
  ) as DecisionReceiptRecord;
  const issuer_authority_statement = JSON.parse(
    readFileSync(join(DIR, "issuer-authority-statement.json"), "utf8"),
  ) as SignedIssuerAuthorityStatement;
  const signed_status_statement = JSON.parse(
    readFileSync(join(DIR, "signed-status-statement.json"), "utf8"),
  ) as SignedReceiptStatusStatement;
  return {
    trust_anchor_bundle,
    decision_receipt,
    issuer_authority_statement,
    signed_status_statement,
  };
}
