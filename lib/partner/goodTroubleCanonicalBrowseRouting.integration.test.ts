// FILE: lib/partner/goodTroubleCanonicalBrowseRouting.integration.test.ts
// Regression: canonical Good Trouble browse tuple must never enter L2 purchase / IDV routing.

import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_ID,
} from "@/lib/goodTrouble/canonicalProductionConfig";
import {
  GOOD_TROUBLE_BROWSE_POLICY_ID,
  GOOD_TROUBLE_PARTNER_ID,
} from "@/lib/goodTrouble/constants";
import { isHostedHolderBootstrapEligible } from "@/lib/auth/hostedHolderEligibility";
import {
  isGoodTroubleBrowseFlow,
  resolveGoodTroubleFlowPurpose,
} from "@/lib/partner/goodTroubleBrowseFlow";
import { isCanonicalGoodTroublePurchaseFlow } from "@/lib/partner/goodTroublePurchaseFlow";
import {
  isAuthoritativeBrowseAccessFlow,
  resolvePartnerContinueContext,
} from "@/lib/partner/resolvePartnerContinueContext";
import { normalizePartnerVerifyInput } from "@/lib/partner/normalizePartnerVerifyInput";
import { findProductionPolicyRules } from "@/lib/policy/productionPolicyContract";

const mockReuse = vi.fn();
const mockCreateRequest = vi.fn();
const mockGetPolicy = vi.fn();
const mockRevocation = vi.fn();

vi.mock("@/lib/assurance/selfAttestation/reuseBrowseSelfAttestation", () => ({
  reuseBrowseSelfAttestation: (...args: unknown[]) => mockReuse(...args),
  buildBrowseReturnUrl: (returnUrl: string, input: {
    browseReceipt: string;
    browseReceiptId: string;
    policyId: string;
  }) => {
    const target = new URL(returnUrl);
    target.searchParams.set("browse_receipt", input.browseReceipt);
    target.searchParams.set("browse_receipt_id", input.browseReceiptId);
    target.searchParams.set("policy_id", input.policyId);
    target.searchParams.set("purpose", "browse");
    return target.toString();
  },
}));

vi.mock("@/lib/verification/requestsService", () => ({
  createVerificationRequest: (...args: unknown[]) => mockCreateRequest(...args),
  getPolicy: (...args: unknown[]) => mockGetPolicy(...args),
}));

vi.mock("@/lib/partner/partnerFlowRevocationRuntime", () => ({
  checkPartnerFlowRevocationGate: (...args: unknown[]) => mockRevocation(...args),
}));

vi.mock("@/lib/connect/returnUrlAllowlist", () => ({
  isReturnUrlAllowed: vi.fn().mockResolvedValue(true),
  buildRedirectUrl: vi.fn(),
}));

import { evaluatePartnerFlow } from "@/lib/partner/relyingPartyFlow";

const GTB_FLOW_ID = `gtb_${"a".repeat(64)}`;
const BROWSE_RETURN_URL =
  `https://www.goodtroublecanna.com/browse-verification-result?gtb=${GTB_FLOW_ID}`;
const PURCHASE_RETURN_URL =
  "https://www.goodtroublecanna.com/age-verification-result?gtv=gtf_" + "b".repeat(64);

const hashFn = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");

async function loadWixBrowseStart() {
  const { buildVerificationStartPayload } = await import(
    "../../examples/good-trouble-wix/backend/nonceLifecycle.js"
  );
  const { TEST_ESCROW_PEPPER_HEX } = await import(
    "../../examples/good-trouble-wix/backend/testPkceEscrowFixtures.js"
  );
  return buildVerificationStartPayload({
    hashFn,
    purpose: "browse",
    escrowPepper: TEST_ESCROW_PEPPER_HEX,
  });
}

describe("Good Trouble canonical browse routing integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRevocation.mockResolvedValue(null);
    mockGetPolicy.mockResolvedValue({
      id: GOOD_TROUBLE_BROWSE_POLICY_ID,
      partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      version: 2,
      rules_json: {
        browse_access_only: true,
        minimum_assurance_cap: "L0",
        allowed_purposes: ["browse"],
      },
    });
    mockCreateRequest.mockResolvedValue({ request_id: "vr-canonical-browse-1" });
    mockReuse.mockResolvedValue({ ok: false, code: "no_reusable_browse_proof" });
  });

  it("1. resolves production browse policy as L0 browse_access_only", () => {
    const rules = findProductionPolicyRules(GOOD_TROUBLE_BROWSE_POLICY_ID);
    expect(rules?.browse_access_only).toBe(true);
    expect(rules?.minimum_assurance_cap).toBe("L0");
    expect(isAuthoritativeBrowseAccessFlow({
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      purpose: "browse",
    })).toBe(true);
  });

  it("2. Wix canonical browse tuple is recognized end-to-end", async () => {
    const payload = await loadWixBrowseStart();
    const url = new URL(payload.verifyUrl);

    expect(url.searchParams.get("partner_id")).toBe(GOOD_TROUBLE_CANONICAL_PARTNER_ID);
    expect(url.searchParams.get("policy_id")).toBe(GOOD_TROUBLE_BROWSE_POLICY_ID);
    expect(url.searchParams.get("purpose")).toBe("browse");
    expect(url.searchParams.get("app")).toBeNull();

    const normalized = normalizePartnerVerifyInput({
      partnerId: url.searchParams.get("partner_id"),
      policyId: url.searchParams.get("policy_id"),
      purpose: url.searchParams.get("purpose"),
      returnUrl: url.searchParams.get("return_url"),
    });
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) return;

    expect(isGoodTroubleBrowseFlow(normalized.params)).toBe(true);
    expect(isHostedHolderBootstrapEligible(normalized.params)).toBe(true);
  });

  it("3. evaluate creates browse VR with browse purpose — never purchase policy", async () => {
    const resolvedPurpose = resolveGoodTroubleFlowPurpose({
      partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      purpose: "browse",
      returnUrl: BROWSE_RETURN_URL,
    });
    expect(resolvedPurpose).toBe("browse");

    const result = await evaluatePartnerFlow({
      suiAddress: "0xabc",
      partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      purpose: "browse",
      returnUrl: BROWSE_RETURN_URL,
    });

    expect(result.next).toBe("passport");
    expect(result.passport_url).toContain("/partner/continue?verify_request=");
    expect(mockCreateRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
        policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
        purpose: "browse",
      }),
    );
    expect(mockCreateRequest).not.toHaveBeenCalledWith(
      expect.objectContaining({ policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID }),
    );
  });

  it("4. /partner/continue selects L0 browse for authoritative canonical VR", () => {
    const context = resolvePartnerContinueContext(
      {
        partnerId: "",
        policyId: "",
        purpose: null,
        returnUrl: BROWSE_RETURN_URL,
        verifyRequestId: "vr-canonical-browse-1",
      },
      {
        partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
        policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
        purpose: "browse",
      },
    );

    expect(context.authoritative).toBe(true);
    expect(context.purpose).toBe("browse");
    expect(context.isDobFirstBrowse).toBe(true);
    expect(isCanonicalGoodTroublePurchaseFlow(context)).toBe(false);
  });

  it("5. rejects purchase policy paired with browse callback (launchpad tuple leak)", () => {
    const conflict = normalizePartnerVerifyInput({
      partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      purpose: "purchase",
      returnUrl: BROWSE_RETURN_URL,
    });
    expect(conflict.ok).toBe(false);
    if (conflict.ok) return;
    expect(conflict.code).toBe("tuple_conflict");
  });

  it("6. purchase tuple still resolves to regulated L2 purchase flow", () => {
    expect(isCanonicalGoodTroublePurchaseFlow({
      partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      purpose: "purchase",
    })).toBe(true);

    const purchaseContinue = resolvePartnerContinueContext(
      {
        partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
        policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
        purpose: "purchase",
        returnUrl: PURCHASE_RETURN_URL,
        verifyRequestId: "vr-canonical-purchase-1",
      },
      {
        partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
        policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
        purpose: "purchase",
      },
    );

    expect(purchaseContinue.isDobFirstBrowse).toBe(false);
    expect(isCanonicalGoodTroublePurchaseFlow(purchaseContinue)).toBe(true);
  });

  it("7. legacy browse partner still maps to the same L0 browse path", () => {
    expect(resolvePartnerContinueContext(
      {
        partnerId: GOOD_TROUBLE_PARTNER_ID,
        policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
        purpose: "browse",
        returnUrl: BROWSE_RETURN_URL,
        verifyRequestId: "vr-legacy-browse",
      },
      {
        partnerId: GOOD_TROUBLE_PARTNER_ID,
        policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
        purpose: "browse",
      },
    ).isDobFirstBrowse).toBe(true);
  });
});
