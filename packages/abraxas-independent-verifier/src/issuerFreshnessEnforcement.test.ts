import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { verifyAbraxasReceiptIndependently } from "./verifyIndependent";
import { enforcementFromIndependentVerification } from "./enforceIndependent";

const FIX = join(process.cwd(), "examples/integration-first-relying-party/fixtures");

describe("issuer statement freshness enforcement", () => {
  it("does not permit when statementObservedAt is stale", () => {
    const record = JSON.parse(readFileSync(join(FIX, "decision-receipt.json"), "utf8"));
    const pin = JSON.parse(readFileSync(join(FIX, "trust-anchor-bundle.json"), "utf8"));
    const sias = JSON.parse(readFileSync(join(FIX, "issuer-authority-statement.json"), "utf8"));
    const status = JSON.parse(readFileSync(join(FIX, "signed-status-statement.json"), "utf8"));

    const verified = verifyAbraxasReceiptIndependently({
      record,
      pinnedTrustAnchor: pin,
      signedIssuerAuthority: sias,
      signedStatusStatement: status,
      relyingParty: {
        partner_id: "partner-integration-821",
        policy_id: "policy-age21-sandbox-821",
        environment: "demo",
      },
      statementObservedAt: "2020-01-01T00:00:00.000Z",
      now: new Date("2026-10-27T14:00:00.000Z"),
    });

    expect(verified.failure_codes).toContain("statement_stale");
    expect(verified.currently_acceptable).not.toBe("yes");

    const enforcement = enforcementFromIndependentVerification(verified);
    expect(enforcement.action).not.toBe("permit");
    expect(enforcement.action).toBe("deny");
  });

  it("permits genuine path when observation is fresh", () => {
    const record = JSON.parse(readFileSync(join(FIX, "decision-receipt.json"), "utf8"));
    const pin = JSON.parse(readFileSync(join(FIX, "trust-anchor-bundle.json"), "utf8"));
    const sias = JSON.parse(readFileSync(join(FIX, "issuer-authority-statement.json"), "utf8"));
    const status = JSON.parse(readFileSync(join(FIX, "signed-status-statement.json"), "utf8"));

    const verified = verifyAbraxasReceiptIndependently({
      record,
      pinnedTrustAnchor: pin,
      signedIssuerAuthority: sias,
      signedStatusStatement: status,
      relyingParty: {
        partner_id: "partner-integration-821",
        policy_id: "policy-age21-sandbox-821",
        environment: "demo",
      },
      statementObservedAt: status.payload.effective_at,
    });

    const enforcement = enforcementFromIndependentVerification(verified);
    expect(enforcement.action).toBe("permit");
    expect(verified.currently_acceptable).toBe("yes");
  });
});
