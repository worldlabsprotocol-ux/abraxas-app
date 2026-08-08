import { describe, expect, it } from "vitest";
import {
  isWebhookHttpsEndpointWellFormed,
  webhookEndpointFormErrorMessage,
} from "@/lib/partner/webhooks/webhookEndpointFormValidation";

describe("webhook endpoint form validation", () => {
  it("accepts well-formed HTTPS URLs", () => {
    expect(isWebhookHttpsEndpointWellFormed("https://hooks.partner.example/abraxas").ok).toBe(true);
  });

  it("rejects HTTP and malformed URLs", () => {
    expect(isWebhookHttpsEndpointWellFormed("http://hooks.partner.example/a").ok).toBe(false);
    expect(isWebhookHttpsEndpointWellFormed("not-a-url").ok).toBe(false);
    expect(isWebhookHttpsEndpointWellFormed("https://hooks.partner.example/a?x=1").ok).toBe(false);
    expect(isWebhookHttpsEndpointWellFormed("https://hooks.partner.example/a#frag").ok).toBe(false);
  });

  it("maps server errors to operator-friendly messages", () => {
    expect(webhookEndpointFormErrorMessage("partner_not_found")).toContain("onboarded partner");
    expect(webhookEndpointFormErrorMessage("webhook_disabled")).toContain("Enable webhook");
  });
});
