import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  GOOD_TROUBLE_BROWSE_POLICY_ID,
  GOOD_TROUBLE_PARTNER_ID,
  GOOD_TROUBLE_RETAIL_POLICY_ID,
} from "@/lib/goodTrouble/constants";
import {
  GOOD_TROUBLE_BROWSE_INTRO,
  GOOD_TROUBLE_BROWSE_STATUS,
  isGoodTroubleBrowseFlow,
} from "./goodTroubleBrowseFlow";
import {
  resolvePartnerContinuationIntro,
  resolvePartnerContinuationStatus,
} from "./partnerVerifyDisplay";

const PARTNER_CONTINUE_SOURCE = readFileSync(
  join(process.cwd(), "components/partner/PartnerContinueClient.tsx"),
  "utf8",
);
const BROWSE_FORM_SOURCE = readFileSync(
  join(process.cwd(), "components/partner/SelfAttestationBrowseForm.tsx"),
  "utf8",
);

describe("isGoodTroubleBrowseFlow", () => {
  it("matches Good Trouble browse policy and purpose", () => {
    expect(isGoodTroubleBrowseFlow({
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      purpose: "browse",
    })).toBe(true);
  });

  it("does not match regulated purchase policy", () => {
    expect(isGoodTroubleBrowseFlow({
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
      purpose: "purchase",
    })).toBe(false);
  });
});

describe("Good Trouble browse partner copy", () => {
  it("uses plain-language browse intro and status", () => {
    expect(resolvePartnerContinuationIntro(GOOD_TROUBLE_PARTNER_ID, {
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      purpose: "browse",
    })).toBe(GOOD_TROUBLE_BROWSE_INTRO);
    expect(resolvePartnerContinuationStatus(GOOD_TROUBLE_PARTNER_ID, {
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      purpose: "browse",
    })).toBe(GOOD_TROUBLE_BROWSE_STATUS);
  });
});

describe("PartnerContinueClient Good Trouble browse deployment contract", () => {
  it("renders DOB-first browse form directly after sign-in", () => {
    expect(PARTNER_CONTINUE_SOURCE).toContain("SelfAttestationBrowseForm");
    expect(PARTNER_CONTINUE_SOURCE).toContain("showDobFirstBrowseForm");
    expect(PARTNER_CONTINUE_SOURCE).toContain("isGoodTroubleBrowseFlow");
  });

  it("does not show wallet binding, ID upload, or purchase copy on browse flow", () => {
    expect(PARTNER_CONTINUE_SOURCE).toContain("!isDobFirstBrowse");
    expect(PARTNER_CONTINUE_SOURCE).toContain("setupVisibility.showWalletBinding");
    expect(PARTNER_CONTINUE_SOURCE).toContain("setupVisibility.showIdentityVerification");
    expect(PARTNER_CONTINUE_SOURCE).not.toContain("Use the traditional partner option");
  });

  it("keeps regulated purchase verification path separate", () => {
    expect(PARTNER_CONTINUE_SOURCE).toContain("AgeAssuranceMethodChooser");
    expect(PARTNER_CONTINUE_SOURCE).toContain('flowTier={flowTier}');
    expect(PARTNER_CONTINUE_SOURCE).toContain("GOOD_TROUBLE_RETAIL_POLICY_ID");
  });
});

describe("SelfAttestationBrowseForm customer copy", () => {
  it("uses DOB-first plain language without technical jargon", () => {
    expect(BROWSE_FORM_SOURCE).toContain("Confirm you&apos;re 21+");
    expect(BROWSE_FORM_SOURCE).toContain("Create my Passport");
    expect(BROWSE_FORM_SOURCE).toContain("Your Passport is ready");
    expect(BROWSE_FORM_SOURCE).toContain("Continue to {partnerName}");
    expect(BROWSE_FORM_SOURCE).toContain("You must be 21+");
    expect(BROWSE_FORM_SOURCE).not.toContain("self-attestation");
    expect(BROWSE_FORM_SOURCE).not.toContain("assurance level");
    expect(BROWSE_FORM_SOURCE).not.toContain("traditional partner option");
  });

  it("checks browse proof reuse before showing the DOB form", () => {
    expect(BROWSE_FORM_SOURCE).toContain("/api/age-assurance/browse-reuse");
  });
});
