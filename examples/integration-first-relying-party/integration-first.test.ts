/**
 * Build #821 — integration-first relying party (package-only, no Supabase / app backend).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BUILD_821_PARTNER_ID,
  BUILD_821_POLICY_ID,
  BUILD_821_ENVIRONMENT,
  build821SyntheticFixtureSet,
} from "./syntheticFixtureFactory";
import {
  integrationFailureSummary,
  permitScopedAction,
  verifyPortableDecision,
  type PortableDecisionArtifacts,
} from "./relyingParty";
import type {
  DecisionReceiptRecord,
  SignedIssuerAuthorityStatement,
  SignedReceiptStatusStatement,
  TrustAnchorBundleV1,
} from "../../packages/abraxas-independent-verifier/src/index";

const FIXTURE_DIR = join(__dirname, "fixtures");

function loadFixturesFromDisk(): PortableDecisionArtifacts & { manifest: Record<string, unknown> } {
  const manifest = JSON.parse(readFileSync(join(FIXTURE_DIR, "manifest.json"), "utf8")) as Record<string, unknown>;
  return {
    manifest,
    record: JSON.parse(readFileSync(join(FIXTURE_DIR, "decision-receipt.json"), "utf8")) as DecisionReceiptRecord,
    pinnedTrustAnchor: JSON.parse(
      readFileSync(join(FIXTURE_DIR, "trust-anchor-bundle.json"), "utf8"),
    ) as TrustAnchorBundleV1,
    signedIssuerAuthority: JSON.parse(
      readFileSync(join(FIXTURE_DIR, "issuer-authority-statement.json"), "utf8"),
    ) as SignedIssuerAuthorityStatement,
    signedStatusStatement: JSON.parse(
      readFileSync(join(FIXTURE_DIR, "signed-status-statement.json"), "utf8"),
    ) as SignedReceiptStatusStatement,
  };
}

const rpScope = {
  partner_id: BUILD_821_PARTNER_ID,
  policy_id: BUILD_821_POLICY_ID,
  environment: BUILD_821_ENVIRONMENT,
};

/** Fixed observe time aligned with synthetic fixture `issued_at` (freshness window). */
const FIXTURE_OBSERVED_AT = "2026-06-01T12:00:05.000Z";

describe("Build #821 integration-first relying party", () => {
  it("accepts synthetic portable decision with standalone verifier (in-memory fixtures)", () => {
    const set = build821SyntheticFixtureSet();
    const result = verifyPortableDecision({
      record: set.decision_receipt,
      pinnedTrustAnchor: set.trust_anchor_bundle,
      signedIssuerAuthority: set.issuer_authority_statement,
      signedStatusStatement: set.signed_status_statement,
      relyingParty: rpScope,
      statementObservedAt: FIXTURE_OBSERVED_AT,
    });
    expect(result.cryptographically_authentic).toBe(true);
    expect(result.issuer_currently_authorized).toBe(true);
    expect(result.status_evidence_authentic).toBe(true);
    expect(permitScopedAction(result)).toBe(true);
  });

  it("accepts the same flow using committed on-disk fixture files", () => {
    const artifacts = loadFixturesFromDisk();
    expect(artifacts.manifest.not_for_production).toBe(true);
    const result = verifyPortableDecision({
      ...artifacts,
      relyingParty: rpScope,
      statementObservedAt: FIXTURE_OBSERVED_AT,
    });
    expect(permitScopedAction(result)).toBe(true);
  });

  it("rejects wrong partner audience binding", () => {
    const set = build821SyntheticFixtureSet();
    const result = verifyPortableDecision({
      record: set.decision_receipt,
      pinnedTrustAnchor: set.trust_anchor_bundle,
      signedIssuerAuthority: set.issuer_authority_statement,
      signedStatusStatement: set.signed_status_statement,
      relyingParty: { ...rpScope, partner_id: "wrong-partner" },
    });
    expect(permitScopedAction(result)).toBe(false);
    expect(integrationFailureSummary(result)).toContain("audience_mismatch");
  });

  it("rejects revoked status evidence", () => {
    const set = build821SyntheticFixtureSet();
    const result = verifyPortableDecision({
      record: set.decision_receipt,
      pinnedTrustAnchor: set.trust_anchor_bundle,
      signedIssuerAuthority: set.issuer_authority_statement,
      signedStatusStatement: set.signed_status_statement_revoked,
      relyingParty: rpScope,
    });
    expect(permitScopedAction(result)).toBe(false);
  });

  it("rejects stale status replay when minimumStatusVersion is ahead", () => {
    const set = build821SyntheticFixtureSet();
    const stale = set.signed_status_statement;
    const result = verifyPortableDecision({
      record: set.decision_receipt,
      pinnedTrustAnchor: set.trust_anchor_bundle,
      signedIssuerAuthority: set.issuer_authority_statement,
      signedStatusStatement: stale,
      relyingParty: rpScope,
      minimumStatusVersion: stale.payload.status_version + 1,
    });
    expect(permitScopedAction(result)).toBe(false);
    expect(integrationFailureSummary(result)).toContain("status_version_rollback_rejected");
  });
});
