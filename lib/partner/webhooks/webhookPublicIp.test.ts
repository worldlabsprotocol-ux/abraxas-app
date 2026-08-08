import { describe, expect, it } from "vitest";
import { blockedIpv4RangeLabel, isPublicWebhookIp } from "@/lib/partner/webhooks/webhookPublicIp";

describe("webhook public IP classifier", () => {
  it("accepts globally routable public IPv4", () => {
    expect(isPublicWebhookIp("93.184.216.34")).toBe(true);
    expect(isPublicWebhookIp("8.8.8.8")).toBe(true);
  });

  it("rejects IPv4 private, loopback, link-local, and metadata ranges", () => {
    for (const ip of ["10.0.0.1", "172.16.0.1", "192.168.1.1", "127.0.0.1", "169.254.169.254"]) {
      expect(isPublicWebhookIp(ip)).toBe(false);
    }
  });

  it("rejects IPv4 0.0.0.0/8, CGNAT, documentation, benchmark, multicast, broadcast", () => {
    const cases: Array<[string, string]> = [
      ["0.0.0.1", "this-network"],
      ["100.64.0.1", "cgnat"],
      ["192.0.2.1", "documentation"],
      ["198.18.0.1", "benchmark"],
      ["198.51.100.1", "documentation"],
      ["203.0.113.1", "documentation"],
      ["224.0.0.1", "multicast"],
      ["240.0.0.1", "reserved"],
      ["255.255.255.255", "broadcast"],
    ];

    for (const [ip, label] of cases) {
      expect(isPublicWebhookIp(ip)).toBe(false);
      expect(blockedIpv4RangeLabel(ip)).toBe(label);
    }
  });

  it("rejects IPv6 loopback, unspecified, link-local, unique-local, documentation, multicast", () => {
    for (const ip of [
      "::",
      "::1",
      "fe80::1",
      "fd12:3456:789a:1::1",
      "2001:db8::1",
      "ff02::1",
      "100::1",
    ]) {
      expect(isPublicWebhookIp(ip)).toBe(false);
    }
  });

  it("rejects IPv4-mapped loopback and private addresses", () => {
    expect(isPublicWebhookIp("::ffff:127.0.0.1")).toBe(false);
    expect(isPublicWebhookIp("::ffff:10.0.0.1")).toBe(false);
    expect(isPublicWebhookIp("::ffff:169.254.169.254")).toBe(false);
  });

  it("accepts normal public IPv6", () => {
    expect(isPublicWebhookIp("2001:4860:4860::8888")).toBe(true);
  });
});
