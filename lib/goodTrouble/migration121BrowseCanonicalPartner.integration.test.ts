// FILE: lib/goodTrouble/migration121BrowseCanonicalPartner.integration.test.ts
// Regression coverage for repaired migration 120 + forward migration 121.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isHostedHolderBootstrapEligible } from "@/lib/auth/hostedHolderEligibility";
import {
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_ID,
} from "@/lib/goodTrouble/canonicalProductionConfig";
import {
  GOOD_TROUBLE_BROWSE_POLICY_ID,
  GOOD_TROUBLE_PARTNER_ID,
} from "@/lib/goodTrouble/constants";
import {
  isGoodTroubleBrowseFlow,
  isGoodTroubleBrowsePartnerId,
  isGoodTroubleHostedDirectHandoff,
} from "@/lib/partner/goodTroubleBrowseFlow";
import { isCanonicalGoodTroublePurchaseFlow } from "@/lib/partner/goodTroublePurchaseFlow";
import { normalizePartnerVerifySearchParams } from "@/lib/partner/normalizePartnerVerifyInput";
import { findProductionPolicyRules, PRODUCTION_PARTNER_POLICIES } from "@/lib/policy/productionPolicyContract";

const MIGRATION_120 = readFileSync(
  join(process.cwd(), "supabase/migrations/120_good_trouble_browse_canonical_partner.sql"),
  "utf8",
);
const MIGRATION_121 = readFileSync(
  join(process.cwd(), "supabase/migrations/121_good_trouble_browse_canonical_partner_publish.sql"),
  "utf8",
);
const SUBMIT_SELF_ATTESTATION_SOURCE = readFileSync(
  join(process.cwd(), "lib/assurance/selfAttestation/submitSelfAttestation.ts"),
  "utf8",
);

const FAILED_120_UPDATE = `
UPDATE public.partner_policies
SET partner_id = 'good-trouble'
WHERE id = 'good-trouble-browse-v1'
  AND partner_id = 'good-trouble-cannabis';
`;

const CANONICAL_BROWSE_CALLBACK = "https://www.goodtroublecanna.com/browse-verification-result";
const hashFn = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");

async function loadWixBrowseStart() {
  const { buildVerificationStartPayload } = await import(
    "../../examples/good-trouble-wix/backend/nonceLifecycle.js"
  );
  const { BROWSE_FLOW } = await import(
    "../../examples/good-trouble-wix/backend/flowPurpose.js"
  );
  const payload = await buildVerificationStartPayload({ hashFn, purpose: "browse" });
  return { payload, browseFlow: BROWSE_FLOW };
}

describe("Good Trouble browse migration 120/121 regression coverage", () => {
  it("1. migration 120 does not mutate active legacy policy ownership", () => {
    expect(MIGRATION_120).not.toMatch(/UPDATE\s+public\.partner_policies/i);
    expect(MIGRATION_121).not.toMatch(/UPDATE\s+public\.partner_policies\s+SET\s+partner_id/i);
    expect(FAILED_120_UPDATE).toMatch(/UPDATE public\.partner_policies/);
    expect(FAILED_120_UPDATE).toMatch(/SET partner_id = 'good-trouble'/);
  });

  it("2. canonical Good Trouble browse policy resolves successfully after publish", () => {
    const browsePolicy = PRODUCTION_PARTNER_POLICIES.find((p) => p.id === GOOD_TROUBLE_BROWSE_POLICY_ID);
    expect(browsePolicy).toBeDefined();
    expect(browsePolicy!.partnerId).toBe(GOOD_TROUBLE_CANONICAL_PARTNER_ID);
    expect(browsePolicy!.rules.allowed_purposes).toEqual(["browse"]);
    expect(browsePolicy!.rules.minimum_assurance_cap).toBe("L0");
    expect(findProductionPolicyRules(GOOD_TROUBLE_BROWSE_POLICY_ID)?.minimum_assurance_cap).toBe("L0");
  });

  it("3. exact Wix-generated canonical browse tuple resolves to browse flow", async () => {
    const { payload, browseFlow } = await loadWixBrowseStart();
    expect(browseFlow.partnerId).toBe(GOOD_TROUBLE_CANONICAL_PARTNER_ID);
    expect(browseFlow.policyId).toBe(GOOD_TROUBLE_BROWSE_POLICY_ID);
    expect(browseFlow.purpose).toBe("browse");
    expect(browseFlow.assuranceLabel).toBe("L0");

    const url = new URL(payload.verifyUrl);
    const normalized = normalizePartnerVerifySearchParams(url.searchParams);
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) return;

    expect(normalized.params.partnerId).toBe(GOOD_TROUBLE_CANONICAL_PARTNER_ID);
    expect(normalized.params.policyId).toBe(GOOD_TROUBLE_BROWSE_POLICY_ID);
    expect(normalized.params.purpose).toBe("browse");
    expect(isGoodTroubleBrowseFlow(normalized.params)).toBe(true);
  });

  it("4. hosted bootstrap and direct handoff remain true for canonical browse tuple", async () => {
    const { payload } = await loadWixBrowseStart();
    const url = new URL(payload.verifyUrl);
    const tuple = {
      partnerId: url.searchParams.get("partner_id") ?? "",
      policyId: url.searchParams.get("policy_id") ?? "",
      purpose: url.searchParams.get("purpose") ?? "",
    };

    expect(isHostedHolderBootstrapEligible(tuple)).toBe(true);
    expect(isGoodTroubleHostedDirectHandoff({
      hostedBootstrapEligible: true,
      ...tuple,
    })).toBe(true);
  });

  it("5. browse reaches DOB-only path (L0 browse policy, not purchase verification)", async () => {
    const browsePolicy = findProductionPolicyRules(GOOD_TROUBLE_BROWSE_POLICY_ID);
    expect(browsePolicy?.browse_access_only).toBe(true);
    expect(browsePolicy?.required_claims?.[0]?.claim_type).toBe("self_attested_age_band");
    expect(browsePolicy?.required_claims?.some((c) => c.claim_type === "identity_verified")).toBe(false);

    const { payload } = await loadWixBrowseStart();
    expect(payload.verifyUrl).not.toContain(GOOD_TROUBLE_CANONICAL_POLICY_ID);
    expect(payload.verifyUrl).not.toContain("age-verification-result");
  });

  it("6. browse receipt uses the authoritative canonical partner id from policy lookup", () => {
    expect(SUBMIT_SELF_ATTESTATION_SOURCE).toContain("const authoritativePartnerId = policy.partner_id");
    expect(SUBMIT_SELF_ATTESTATION_SOURCE).toContain("isGoodTroubleBrowsePartnerId");
    expect(MIGRATION_121).toContain("partner_id = v_canonical_partner");
    expect(MIGRATION_121).toContain("publish_partner_policy_draft");
  });

  it("7. legacy browse compatibility still works where intended", () => {
    expect(isGoodTroubleBrowsePartnerId(GOOD_TROUBLE_PARTNER_ID)).toBe(true);
    expect(isGoodTroubleBrowseFlow({
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      purpose: "browse",
    })).toBe(true);
    expect(MIGRATION_120).toContain("'good-trouble-cannabis'");
    expect(SUBMIT_SELF_ATTESTATION_SOURCE).toMatch(
      /input\.policyId === GOOD_TROUBLE_BROWSE_POLICY_ID[\s\S]*isGoodTroubleBrowsePartnerId\(input\.partnerId\)/,
    );
  });

  it("8. legacy compatibility cannot satisfy purchase", () => {
    expect(isGoodTroubleBrowseFlow({
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      purpose: "purchase",
    })).toBe(false);
    expect(isCanonicalGoodTroublePurchaseFlow({
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      purpose: "purchase",
    })).toBe(false);
    expect(isGoodTroubleBrowseFlow({
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      purpose: "purchase",
    })).toBe(false);
  });

  it("9. purchase tuple and L2 requirements are unchanged", async () => {
    expect(GOOD_TROUBLE_CANONICAL_POLICY_ID).toBe("good-trouble-age_21_retail-v1");
    expect(isCanonicalGoodTroublePurchaseFlow({
      partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      purpose: "purchase",
    })).toBe(true);

    const { PURCHASE_FLOW } = await import("../../examples/good-trouble-wix/backend/flowPurpose.js");
    expect(PURCHASE_FLOW.partnerId).toBe(GOOD_TROUBLE_CANONICAL_PARTNER_ID);
    expect(PURCHASE_FLOW.policyId).toBe(GOOD_TROUBLE_CANONICAL_POLICY_ID);
    expect(PURCHASE_FLOW.purpose).toBe("purchase");
    expect(PURCHASE_FLOW.assuranceLabel).toBe("L2+");
    expect(PURCHASE_FLOW.policyId).not.toBe(GOOD_TROUBLE_BROWSE_POLICY_ID);
  });

  it("10. callback allowlist is correct for canonical and legacy browse partners", () => {
    expect(MIGRATION_120).toContain(CANONICAL_BROWSE_CALLBACK);
    expect(MIGRATION_120).toContain("WHERE partner_id = 'good-trouble'");
    expect(MIGRATION_120).toContain("WHERE partner_id = 'good-trouble-cannabis'");
    expect(MIGRATION_120).toContain("allowed_return_urls");
  });
});
