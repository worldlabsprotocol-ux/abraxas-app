// @vitest-environment jsdom
// FILE: lib/partner/goodTroubleLegacyBrowseVerify.integration.test.ts
// Legacy missing-policy browse URL → OAuth resume → evaluate → DOB → return.

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GOOD_TROUBLE_BROWSE_POLICY_ID,
  GOOD_TROUBLE_PARTNER_ID,
} from "@/lib/goodTrouble/constants";
import { GOOD_TROUBLE_BROWSE_PRIMARY_BUTTON } from "@/lib/partner/goodTroubleBrowseFlow";
import { GOOD_TROUBLE_LEGACY_BROWSE_INVALID_LINK_MESSAGE } from "@/lib/partner/normalizePartnerVerifyInput";
import {
  buildPartnerVerifyPath,
  consumePartnerVerifyResumePath,
  savePartnerVerifyResume,
} from "@/lib/partner/partnerVerifyResume";
import { resolvePartnerContinueContext } from "@/lib/partner/resolvePartnerContinueContext";

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

vi.mock("@/lib/partner/returnUrlAllowlist", () => ({
  isAllowedPartnerReturnUrl: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/partner/logPartnerUsage", () => ({ logPartnerUsage: vi.fn() }));
vi.mock("@/lib/partner/partnerMeteringHooks", () => ({ maybeRecordPartnerFlowReceiptMetering: vi.fn() }));
vi.mock("@/lib/partner/webhooks/webhookHooks", () => ({ maybeEnqueuePartnerReceiptIssued: vi.fn() }));
vi.mock("@/lib/partner/partnerFlowRouteGuard", () => ({
  enforcePartnerFlowRateLimit: vi.fn(async () => null),
  recordPartnerFlowRequestOutcome: vi.fn(),
}));
vi.mock("@/lib/partner/partnerFlowAudit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/partner/partnerFlowAudit")>();
  return {
    ...actual,
    auditPartnerFlowStepRequired: vi.fn(),
    auditPartnerFlowReceiptOutcome: vi.fn(),
    auditPartnerFlowStepBestEffort: vi.fn(),
    resolvePartnerFlowTraceId: vi.fn(() => "trace-legacy"),
  };
});

import { normalizePartnerVerifySearchParams } from "@/lib/partner/normalizePartnerVerifyInput";
import { evaluatePartnerFlow } from "@/lib/partner/relyingPartyFlow";

const GTB_FLOW_ID = `gtb_${"a".repeat(64)}`;
const LEGACY_BROWSE_RETURN_URL =
  `https://www.goodtroublecanna.com/browse-verification-result?gtb=${GTB_FLOW_ID}`;

const LEGACY_VERIFY_PATH =
  `/partner/verify?partner_id=${GOOD_TROUBLE_PARTNER_ID}`
  + `&return_url=${encodeURIComponent(LEGACY_BROWSE_RETURN_URL)}`;

describe("Good Trouble legacy browse verify integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockRevocation.mockResolvedValue(null);
    mockGetPolicy.mockResolvedValue({
      id: GOOD_TROUBLE_BROWSE_POLICY_ID,
      version: 1,
      rules_json: { browse_access_only: true },
    });
    mockCreateRequest.mockResolvedValue({ request_id: "vr-legacy-browse" });
    mockReuse.mockResolvedValue({ ok: false, code: "no_reusable_browse_proof" });
  });

  it("covers exact production URL shape without policy_id or purpose", () => {
    const params = new URLSearchParams(LEGACY_VERIFY_PATH.split("?")[1]);
    const normalized = normalizePartnerVerifySearchParams(params);

    expect(normalized.ok).toBe(true);
    if (!normalized.ok) return;
    expect(normalized.params.policyId).toBe(GOOD_TROUBLE_BROWSE_POLICY_ID);
    expect(normalized.params.purpose).toBe("browse");
  });

  it("persists normalized tuple in OAuth resume cookie path", () => {
    const params = new URLSearchParams(LEGACY_VERIFY_PATH.split("?")[1]);
    const normalized = normalizePartnerVerifySearchParams(params);
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) return;

    savePartnerVerifyResume(normalized.params);
    const restored = consumePartnerVerifyResumePath();
    expect(restored).toContain("policy_id=good-trouble-browse-v1");
    expect(restored).toContain("purpose=browse");
  });

  it("evaluatePartnerFlow stores browse purpose on verification request for normalized legacy input", async () => {
    const result = await evaluatePartnerFlow({
      suiAddress: "0xabc",
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      purpose: "browse",
      returnUrl: LEGACY_BROWSE_RETURN_URL,
    });

    expect(result.next).toBe("passport");
    expect(mockCreateRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        partnerId: GOOD_TROUBLE_PARTNER_ID,
        policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
        purpose: "browse",
      }),
    );
  });

  it("resolves /partner/continue to DOB browse mode from stored verification request", () => {
    const context = resolvePartnerContinueContext(
      {
        partnerId: GOOD_TROUBLE_PARTNER_ID,
        policyId: "",
        purpose: null,
        returnUrl: LEGACY_BROWSE_RETURN_URL,
        verifyRequestId: "vr-legacy-browse",
      },
      {
        partnerId: GOOD_TROUBLE_PARTNER_ID,
        policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
        purpose: "browse",
      },
    );

    expect(context.isDobFirstBrowse).toBe(true);
    expect(context.purpose).toBe("browse");
  });

  it("auto-returns when reusable browse proof exists", async () => {
    mockReuse.mockResolvedValue({
      ok: true,
      browse_receipt: "jwt-legacy",
      browse_receipt_id: "br_legacy",
      expires_at: "2099-01-01T00:00:00.000Z",
      age_band: "over_21",
    });

    const result = await evaluatePartnerFlow({
      suiAddress: "0xabc",
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      purpose: "browse",
      returnUrl: LEGACY_BROWSE_RETURN_URL,
    });

    expect(result.next).toBe("enter");
    expect(result.redirect_url).toContain("browse_receipt=jwt-legacy");
    expect(mockCreateRequest).not.toHaveBeenCalled();
  });

  it("rejects legacy URL with purchase callback during normalization", () => {
    const result = normalizePartnerVerifySearchParams(new URLSearchParams({
      partner_id: GOOD_TROUBLE_PARTNER_ID,
      return_url: "https://www.goodtroublecanna.com/age-verification-result?gtv=gtf_" + "c".repeat(64),
    }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.invalidLinkMessage).toBe(GOOD_TROUBLE_LEGACY_BROWSE_INVALID_LINK_MESSAGE);
  });

  it("exports browse primary button constant for DOB form regression", () => {
    expect(GOOD_TROUBLE_BROWSE_PRIMARY_BUTTON).toBe("Continue");
    expect(buildPartnerVerifyPath({
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      purpose: "browse",
      returnUrl: LEGACY_BROWSE_RETURN_URL,
    })).toContain("purpose=browse");
  });
});
