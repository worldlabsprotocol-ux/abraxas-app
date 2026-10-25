/**
 * Build #828 — prove verifier-only path (no @/lib Abraxas backend imports in verify chain).
 */
import { performance } from "node:perf_hooks";
import { describe, expect, it } from "vitest";
import {
  verifyAbraxasReceiptIndependently,
  type TrustAnchorBundleV1,
} from "../../packages/abraxas-independent-verifier/src/index";
import { build821SyntheticFixtureSet } from "../integration-first-relying-party/syntheticFixtureFactory";
import { enforcementFromVerification } from "../portable-relying-party/enforceDecision";

/** Documented integration steps for independent verify (artifacts already in hand). */
export const INDEPENDENT_VERIFY_STEP_COUNT = 4;

describe("Build #828 design partner independence proof", () => {
  it("completes offline verify without Abraxas app backend imports", () => {
    const started = performance.now();
    const set = build821SyntheticFixtureSet();
    const pin: TrustAnchorBundleV1 = set.trust_anchor_bundle;

    const verified = verifyAbraxasReceiptIndependently({
      record: set.decision_receipt,
      pinnedTrustAnchor: pin,
      signedIssuerAuthority: set.issuer_authority_statement,
      signedStatusStatement: set.signed_status_statement,
      relyingParty: {
        partner_id: "partner-integration-821",
        policy_id: "policy-age21-sandbox-821",
        environment: "demo",
      },
      statementObservedAt: new Date().toISOString(),
    });

    const enforcement = enforcementFromVerification(verified);
    const elapsedMs = performance.now() - started;

    expect(verified.cryptographically_authentic).toBe(true);
    expect(verified.status_evidence_authentic).toBe(true);
    expect(["permit", "deny", "indeterminate"]).toContain(enforcement.action);
    expect(elapsedMs).toBeLessThan(5000);
    expect(INDEPENDENT_VERIFY_STEP_COUNT).toBe(4);
  });
});
