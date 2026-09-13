import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  GOOD_TROUBLE_BROWSE_POLICY_ID,
  GOOD_TROUBLE_PARTNER_ID,
  GOOD_TROUBLE_RETAIL_POLICY_ID,
} from "@/lib/goodTrouble/constants";
import {
  GOOD_TROUBLE_BROWSE_DOB_HEADING,
  GOOD_TROUBLE_BROWSE_EYEBROW,
  GOOD_TROUBLE_BROWSE_HEADING,
  GOOD_TROUBLE_BROWSE_INTRO,
  GOOD_TROUBLE_BROWSE_PRIMARY_BUTTON,
  GOOD_TROUBLE_BROWSE_STATUS,
  GOOD_TROUBLE_BROWSE_SUPPORTING,
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
const PARTNER_VERIFY_CLIENT_SOURCE = readFileSync(
  join(process.cwd(), "components/partner/PartnerVerifyClient.tsx"),
  "utf8",
);
const PARTNER_VERIFY_SHELL_SOURCE = readFileSync(
  join(process.cwd(), "components/partner/PartnerVerifyShell.tsx"),
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

  it("does not match browse purpose with retail policy", () => {
    expect(isGoodTroubleBrowseFlow({
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
      purpose: "browse",
    })).toBe(false);
  });

  it("does not match purchase purpose with browse policy", () => {
    expect(isGoodTroubleBrowseFlow({
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
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
  it("resolves browse flow from verification request and renders DOB form directly", () => {
    expect(PARTNER_CONTINUE_SOURCE).toContain("resolvePartnerContinueContext");
    expect(PARTNER_CONTINUE_SOURCE).toContain("/api/v1/verification-requests/");
    expect(PARTNER_CONTINUE_SOURCE).toContain("SelfAttestationBrowseForm");
    expect(PARTNER_CONTINUE_SOURCE).toContain("isDobFirstBrowse");
    expect(PARTNER_CONTINUE_SOURCE).toContain("GOOD_TROUBLE_BROWSE_EYEBROW");
    expect(PARTNER_CONTINUE_SOURCE).toContain("GOOD_TROUBLE_BROWSE_HEADING");
  });

  it("never renders PartnerFlowReturnHandler on the browse path", () => {
    const browseBranch = PARTNER_CONTINUE_SOURCE.split("if (isDobFirstBrowse)")[1]?.split("return (")[0] ?? "";
    expect(browseBranch).not.toContain("PartnerFlowReturnHandler");
    expect(PARTNER_CONTINUE_SOURCE).not.toContain("Return pending");
  });

  it("keeps regulated purchase verification path separate", () => {
    expect(PARTNER_CONTINUE_SOURCE).toContain("AgeAssuranceMethodChooser");
    expect(PARTNER_CONTINUE_SOURCE).toContain("compactCheckout");
    expect(PARTNER_CONTINUE_SOURCE).toContain("GOOD_TROUBLE_RETAIL_POLICY_ID");
  });

  it("returns the traditional fallback to the partner home page", () => {
    expect(PARTNER_CONTINUE_SOURCE).toContain("window.location.assign(partnerHomeUrl)");
    expect(PARTNER_CONTINUE_SOURCE).not.toContain("decodeURIComponent(returnPath)");
  });
});

describe("PartnerVerify sign-in deployment contract", () => {
  it("reads purpose and passes DOB-first browse state into PartnerVerifyShell", () => {
    expect(PARTNER_VERIFY_CLIENT_SOURCE).toContain('searchParams.get("purpose")');
    expect(PARTNER_VERIFY_CLIENT_SOURCE).toContain("isGoodTroubleBrowseFlow");
    expect(PARTNER_VERIFY_CLIENT_SOURCE).toContain("isDobFirstBrowse={isDobFirstBrowse}");
    expect(PARTNER_VERIFY_CLIENT_SOURCE).toContain("policyId={policyId}");
    expect(PARTNER_VERIFY_CLIENT_SOURCE).toContain("purpose={purpose}");
  });

  it("uses Passport value copy on the Good Trouble browse sign-in screen", () => {
    expect(PARTNER_VERIFY_SHELL_SOURCE).toContain("GOOD_TROUBLE_BROWSE_SIGN_IN_INTRO");
    expect(PARTNER_VERIFY_SHELL_SOURCE).toContain("GOOD_TROUBLE_BROWSE_SIGN_IN_BUTTON");
    expect(PARTNER_VERIFY_SHELL_SOURCE).toContain("GOOD_TROUBLE_BROWSE_SIGN_IN_VALUE_HEADING");
    expect(PARTNER_VERIFY_SHELL_SOURCE).toContain("isDobFirstBrowse");
  });
});

describe("SelfAttestationBrowseForm customer copy", () => {
  it("uses the simplified browse copy without technical jargon", () => {
    expect(BROWSE_FORM_SOURCE).toContain("GOOD_TROUBLE_BROWSE_PRIMARY_BUTTON");
    expect(BROWSE_FORM_SOURCE).toContain("GOOD_TROUBLE_BROWSE_PRIMARY_BUTTON");
    expect(BROWSE_FORM_SOURCE).toContain("GOOD_TROUBLE_BROWSE_CHECKING_STATE");
    expect(BROWSE_FORM_SOURCE).toContain("GOOD_TROUBLE_BROWSE_SUCCESS_STATE");
    expect(BROWSE_FORM_SOURCE).not.toContain("self-attestation");
    expect(BROWSE_FORM_SOURCE).not.toContain("assurance level");
    expect(BROWSE_FORM_SOURCE).not.toContain("Return pending");
    expect(BROWSE_FORM_SOURCE).not.toContain("StatusBanner");
  });

  it("checks browse proof reuse before showing the DOB form", () => {
    expect(BROWSE_FORM_SOURCE).toContain("/api/age-assurance/browse-reuse");
  });
});

describe("Good Trouble browse screen chrome", () => {
  it("uses the minimal browse heading and supporting line", () => {
    expect(GOOD_TROUBLE_BROWSE_EYEBROW).toBe("PRIVATE AGE CHECK");
    expect(GOOD_TROUBLE_BROWSE_HEADING).toBe("Confirm you're 21+");
    expect(GOOD_TROUBLE_BROWSE_SUPPORTING).toBe(
      "Enter your birthday once. Good Trouble receives only a yes-or-no result.",
    );
    expect(GOOD_TROUBLE_BROWSE_PRIMARY_BUTTON).toBe("Continue");
  });
});
