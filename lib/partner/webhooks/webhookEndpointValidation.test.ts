import { describe, expect, it, vi } from "vitest";
import {
  isWebhookEndpointStructurallyAllowed,
  parseWebhookEndpointUrl,
} from "@/lib/partner/webhooks/webhookEndpointValidation";

describe("webhook endpoint SSRF validation", () => {
  it("accepts clean HTTPS endpoints", () => {
    const url = parseWebhookEndpointUrl("https://hooks.partner.example/abraxas");
    expect(url).not.toBeNull();
    expect(isWebhookEndpointStructurallyAllowed(url!)).toBe(true);
  });

  it("rejects non-HTTPS endpoints", () => {
    const url = parseWebhookEndpointUrl("http://hooks.partner.example/abraxas");
    expect(url).not.toBeNull();
    expect(isWebhookEndpointStructurallyAllowed(url!)).toBe(false);
  });

  it("rejects query strings and fragments", () => {
    const withQuery = parseWebhookEndpointUrl("https://hooks.partner.example/abraxas?token=secret");
    expect(withQuery).not.toBeNull();
    expect(isWebhookEndpointStructurallyAllowed(withQuery!)).toBe(false);

    const withHash = parseWebhookEndpointUrl("https://hooks.partner.example/abraxas#frag");
    expect(withHash).not.toBeNull();
    expect(isWebhookEndpointStructurallyAllowed(withHash!)).toBe(false);
  });

  it("rejects localhost and metadata hosts", () => {
    for (const endpoint of [
      "https://localhost/webhook",
      "https://127.0.0.1/webhook",
      "https://169.254.169.254/latest/meta-data",
      "https://metadata.google.internal/computeMetadata/v1",
    ]) {
      const url = parseWebhookEndpointUrl(endpoint);
      expect(url).not.toBeNull();
      expect(isWebhookEndpointStructurallyAllowed(url!)).toBe(false);
    }
  });

  it("rejects private IPv4 literals", () => {
    const url = parseWebhookEndpointUrl("https://10.0.0.5/webhook");
    expect(url).not.toBeNull();
    expect(isWebhookEndpointStructurallyAllowed(url!)).toBe(false);
  });
});

describe("webhook DNS resolution guard", () => {
  it("rejects hostnames resolving to private addresses", async () => {
    const { assertWebhookEndpointResolvable } = await import("@/lib/partner/webhooks/webhookEndpointValidation");
    const dns = await import("dns");
    vi.spyOn(dns.promises, "lookup").mockResolvedValue([{ address: "10.0.0.8", family: 4 }] as never);

    const url = parseWebhookEndpointUrl("https://partner.example/webhook")!;
    await expect(assertWebhookEndpointResolvable(url)).rejects.toThrow("webhook_endpoint_resolves_private");
    vi.restoreAllMocks();
  });
});
