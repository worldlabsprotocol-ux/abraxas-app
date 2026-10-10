// FILE: lib/partner/goodTroubleWixBrowseTuple.integration.test.ts
// Wix BROWSE_FLOW → Abraxas browse/hosted-bootstrap/direct-handoff parity regression.

import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isHostedHolderBootstrapEligible } from "@/lib/auth/hostedHolderEligibility";
import {
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
} from "@/lib/goodTrouble/canonicalProductionConfig";
import {
  GOOD_TROUBLE_BROWSE_POLICY_ID,
  GOOD_TROUBLE_PARTNER_ID,
} from "@/lib/goodTrouble/constants";
import {
  isGoodTroubleBrowseFlow,
  isGoodTroubleHostedDirectHandoff,
} from "@/lib/partner/goodTroubleBrowseFlow";
import { normalizePartnerVerifySearchParams } from "@/lib/partner/normalizePartnerVerifyInput";

const hashFn = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");

async function loadWixBrowseStart() {
  const { buildVerificationStartPayload } = await import(
    "../../examples/good-trouble-wix/backend/nonceLifecycle.js"
  );
  const { BROWSE_FLOW } = await import(
    "../../examples/good-trouble-wix/backend/flowPurpose.js"
  );
  const { TEST_ESCROW_PEPPER_HEX } = await import(
    "../../examples/good-trouble-wix/backend/testPkceEscrowFixtures.js"
  );
  const payload = await buildVerificationStartPayload({
    hashFn,
    purpose: "browse",
    escrowPepper: TEST_ESCROW_PEPPER_HEX,
  });
  return { payload, browseFlow: BROWSE_FLOW };
}

function parseVerifyTuple(verifyUrl: string) {
  const url = new URL(verifyUrl);
  return {
    partnerId: url.searchParams.get("partner_id") ?? "",
    policyId: url.searchParams.get("policy_id") ?? "",
    purpose: url.searchParams.get("purpose") ?? "",
    returnUrl: url.searchParams.get("return_url") ?? "",
    app: url.searchParams.get("app") ?? "",
  };
}

describe("Good Trouble Wix browse tuple → Abraxas detection", () => {
  it("Wix browse start generates canonical browse tuple with gtb lifecycle", async () => {
    const { payload, browseFlow } = await loadWixBrowseStart();

    expect(browseFlow.partnerId).toBe(GOOD_TROUBLE_CANONICAL_PARTNER_ID);
    expect(browseFlow.policyId).toBe(GOOD_TROUBLE_BROWSE_POLICY_ID);
    expect(browseFlow.purpose).toBe("browse");
    expect(payload.flowId).toMatch(/^gtb_[a-f0-9]{64}$/);
    expect(payload.policyId).toBe(GOOD_TROUBLE_BROWSE_POLICY_ID);
    expect(payload.purpose).toBe("browse");

    const tuple = parseVerifyTuple(payload.verifyUrl);
    expect(tuple.partnerId).toBe(GOOD_TROUBLE_CANONICAL_PARTNER_ID);
    expect(tuple.policyId).toBe(GOOD_TROUBLE_BROWSE_POLICY_ID);
    expect(tuple.purpose).toBe("browse");
    expect(tuple.returnUrl).toContain("browse-verification-result");
    expect(tuple.returnUrl).toContain("gtb_");
    expect(tuple.app).toBe("");
    expect(payload.verifyUrl).not.toContain("good-trouble-age_21_retail-v1");
    expect(payload.verifyUrl).not.toContain("age-verification-result");
    expect(payload.verifyUrl).not.toMatch(/gtf_/);
  });

  it("generated Wix tuple is recognized by hosted bootstrap and direct handoff", async () => {
    const { payload } = await loadWixBrowseStart();
    const tuple = parseVerifyTuple(payload.verifyUrl);

    expect(isGoodTroubleBrowseFlow(tuple)).toBe(true);
    expect(isHostedHolderBootstrapEligible(tuple)).toBe(true);
    expect(isGoodTroubleHostedDirectHandoff({
      hostedBootstrapEligible: true,
      partnerId: tuple.partnerId,
      policyId: tuple.policyId,
      purpose: tuple.purpose,
    })).toBe(true);
  });

  it("normalizes Wix verify URL through the same server-side verify parser", async () => {
    const { payload } = await loadWixBrowseStart();
    const url = new URL(payload.verifyUrl);
    const normalized = normalizePartnerVerifySearchParams(url.searchParams);

    expect(normalized.ok).toBe(true);
    if (!normalized.ok) return;

    expect(normalized.params.partnerId).toBe(GOOD_TROUBLE_CANONICAL_PARTNER_ID);
    expect(normalized.params.policyId).toBe(GOOD_TROUBLE_BROWSE_POLICY_ID);
    expect(normalized.params.purpose).toBe("browse");
    expect(isGoodTroubleBrowseFlow(normalized.params)).toBe(true);
  });

  it("keeps explicit legacy browse partner compatibility without widening purchase", () => {
    expect(isGoodTroubleBrowseFlow({
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      purpose: "browse",
    })).toBe(true);
    expect(isGoodTroubleBrowseFlow({
      partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policyId: "good-trouble-age_21_retail-v1",
      purpose: "browse",
    })).toBe(false);
    expect(isGoodTroubleBrowseFlow({
      partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      purpose: "purchase",
    })).toBe(false);
  });
});
