import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { verifyAbraxasReceiptIndependently } from "../../packages/abraxas-independent-verifier/src/index";
import { assertBundledAnchorMatchesPin } from "./pinTrustAnchor";
import { enforcementFromVerification } from "./enforceDecision";

const FIX = join(process.cwd(), "examples/integration-first-relying-party/fixtures");

describe("portable relying party example (fixtures)", () => {
  it("permits synthetic happy path offline", () => {
    const record = JSON.parse(readFileSync(join(FIX, "decision-receipt.json"), "utf8"));
    const pin = JSON.parse(readFileSync(join(FIX, "trust-anchor-bundle.json"), "utf8"));
    const sias = JSON.parse(readFileSync(join(FIX, "issuer-authority-statement.json"), "utf8"));
    const status = JSON.parse(readFileSync(join(FIX, "signed-status-statement.json"), "utf8"));

    const pinMatch = assertBundledAnchorMatchesPin({ bundled: pin, integratorPinned: pin });
    expect(pinMatch.ok).toBe(true);

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

    const enforcement = enforcementFromVerification(verified);
    expect(enforcement.action).toBe("permit");
  });

  it("rejects wrong audience offline", () => {
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
        partner_id: "wrong-partner",
        policy_id: "policy-age21-sandbox-821",
        environment: "demo",
      },
      statementObservedAt: status.payload.effective_at,
    });

    const enforcement = enforcementFromVerification(verified);
    expect(enforcement.action).not.toBe("permit");
  });
});
