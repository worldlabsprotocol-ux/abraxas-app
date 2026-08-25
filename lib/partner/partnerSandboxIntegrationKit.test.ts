import { describe, expect, it } from "vitest";
import {
  buildSandboxEntryUrlTemplate,
  deriveSandboxTestSendUiMode,
  evaluateSandboxReceiptChecks,
  formatWebhookTestRateLimitMessage,
  hasDeliveredSandboxTest,
  partnerHasWebhooksReadScope,
  deriveWebhookProgress,
  parseWebhookTestRetryAfterSec,
  WEBHOOK_TEST_NOT_RECEIPT_API_NOTE,
} from "@/lib/partner/partnerSandboxIntegrationKit";
import { PARTNER_WEBHOOK_TEST_EVENT_TYPE } from "@/lib/partner/webhooks/types";

describe("partnerSandboxIntegrationKit", () => {
  it("builds entry URL template with placeholders, not complete URL", () => {
    const url = buildSandboxEntryUrlTemplate("acme-retail-v1", "https://abraxasworld.xyz");
    expect(url).toContain("partner_id=acme-retail-v1");
    expect(url).toContain("policy_id=%3Cpolicy_id%3E");
    expect(url).toContain("return_url=%3Chttps");
    expect(url).not.toMatch(/policy_id=acme/);
    expect(url).not.toContain("abx_test_");
  });

  it("detects webhooks:read scope", () => {
    expect(partnerHasWebhooksReadScope(["verify:credential", "webhooks:read"])).toBe(true);
    expect(partnerHasWebhooksReadScope(["verify:credential", "verify:registry"])).toBe(false);
  });

  it("passes sandbox receipt with production_usable:false and expected invalidation", () => {
    const { checks, sandboxValidationPassed } = evaluateSandboxReceiptChecks(
      {
        signature_valid: true,
        decision_result: "approved",
        partner_id: "acme-v1",
        policy_id: "sandbox-policy-v1",
        production_usable: false,
        currently_valid: false,
        invalidation_reasons: ["production_not_usable:false"],
      },
      { partnerId: "acme-v1", policyId: "sandbox-policy-v1" },
    );

    expect(sandboxValidationPassed).toBe(true);
    const currentlyValid = checks.find((c) => c.id === "sandbox_currently_valid");
    expect(currentlyValid?.detail).toContain("production_not_usable:false");
    expect(currentlyValid?.detail).toContain("expected");
  });

  it("fails sandbox receipt without signature_valid", () => {
    const { sandboxValidationPassed } = evaluateSandboxReceiptChecks(
      {
        signature_valid: false,
        decision_result: "approved",
        partner_id: "acme-v1",
        policy_id: "sandbox-policy-v1",
        production_usable: false,
      },
      { partnerId: "acme-v1", policyId: "sandbox-policy-v1" },
    );
    expect(sandboxValidationPassed).toBe(false);
  });

  it("fails sandbox receipt with partner mismatch", () => {
    const { sandboxValidationPassed } = evaluateSandboxReceiptChecks(
      {
        signature_valid: true,
        decision_result: "approved",
        partner_id: "other-partner",
        policy_id: "sandbox-policy-v1",
      },
      { partnerId: "acme-v1", policyId: "sandbox-policy-v1" },
    );
    expect(sandboxValidationPassed).toBe(false);
  });

  it("derives webhook progress without inferring signature verified from delivery", () => {
    expect(
      deriveWebhookProgress({
        hasQueuedTestEvent: false,
        hasDeliveredTestEvent: false,
        signatureVerifiedAcknowledged: false,
      }),
    ).toBe("not_started");

    expect(
      deriveWebhookProgress({
        hasQueuedTestEvent: true,
        hasDeliveredTestEvent: false,
        signatureVerifiedAcknowledged: false,
      }),
    ).toBe("queued");

    expect(
      deriveWebhookProgress({
        hasQueuedTestEvent: true,
        hasDeliveredTestEvent: true,
        signatureVerifiedAcknowledged: false,
      }),
    ).toBe("delivered");

    expect(
      deriveWebhookProgress({
        hasQueuedTestEvent: true,
        hasDeliveredTestEvent: true,
        signatureVerifiedAcknowledged: true,
      }),
    ).toBe("signature_verified");
  });

  it("does not connect webhook test events to receipt API", () => {
    expect(WEBHOOK_TEST_NOT_RECEIPT_API_NOTE).toContain(PARTNER_WEBHOOK_TEST_EVENT_TYPE);
    expect(WEBHOOK_TEST_NOT_RECEIPT_API_NOTE).toContain("never validated via");
    expect(WEBHOOK_TEST_NOT_RECEIPT_API_NOTE).not.toMatch(/validate.*webhook.*receipt/i);
  });

  it("detects delivered sandbox test events only", () => {
    expect(hasDeliveredSandboxTest([
      { event_type: PARTNER_WEBHOOK_TEST_EVENT_TYPE, status: "delivered" },
    ])).toBe(true);
    expect(hasDeliveredSandboxTest([
      { event_type: PARTNER_WEBHOOK_TEST_EVENT_TYPE, status: "pending" },
    ])).toBe(false);
    expect(hasDeliveredSandboxTest([
      { event_type: "partner.receipt.issued", status: "delivered" },
    ])).toBe(false);
  });

  it("derives sandbox test send UI modes", () => {
    expect(deriveSandboxTestSendUiMode({
      testAvailable: false,
      deliveries: [],
      confirmingRepeat: false,
      sending: false,
    })).toBe("blocked");

    expect(deriveSandboxTestSendUiMode({
      testAvailable: true,
      deliveries: [],
      confirmingRepeat: false,
      sending: false,
    })).toBe("first_send_ready");

    expect(deriveSandboxTestSendUiMode({
      testAvailable: true,
      deliveries: [{ event_type: PARTNER_WEBHOOK_TEST_EVENT_TYPE, status: "delivered" }],
      confirmingRepeat: false,
      sending: false,
    })).toBe("repeat_idle");

    expect(deriveSandboxTestSendUiMode({
      testAvailable: true,
      deliveries: [{ event_type: PARTNER_WEBHOOK_TEST_EVENT_TYPE, status: "delivered" }],
      confirmingRepeat: true,
      sending: false,
    })).toBe("repeat_confirming");
  });

  it("formats webhook test rate-limit guidance", () => {
    expect(formatWebhookTestRateLimitMessage(30)).toContain("30 seconds");
    expect(formatWebhookTestRateLimitMessage()).toContain("about a minute");
  });

  it("parses Retry-After header values safely", () => {
    expect(parseWebhookTestRetryAfterSec("45")).toBe(45);
    expect(parseWebhookTestRetryAfterSec("0")).toBeNull();
    expect(parseWebhookTestRetryAfterSec("invalid")).toBeNull();
    expect(parseWebhookTestRetryAfterSec(null)).toBeNull();
  });
});
