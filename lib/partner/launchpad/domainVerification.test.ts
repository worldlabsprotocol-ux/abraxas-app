import { describe, expect, it } from "vitest";
import {
  dnsTxtRecordsContainToken,
  domainVerificationRecordName,
  domainVerificationRecordValue,
  isVerifiedDomainForCallbacks,
  productionCallbackHostname,
} from "./domainVerification";

describe("Launchpad domain verification", () => {
  it("only derives a hostname from a real production callback", () => {
    expect(productionCallbackHostname("http://localhost:3000/callback")).toBeNull();
    expect(productionCallbackHostname("https://partner.example.com/auth/callback")).toBe("partner.example.com");
  });

  it("uses an exact TXT record instead of accepting a partial match", () => {
    const token = "trusted-token";
    expect(domainVerificationRecordName("Partner.Example.com")).toBe("_abraxas-verification.partner.example.com");
    expect(domainVerificationRecordValue(token)).toBe("abraxas-domain-verification=trusted-token");
    expect(dnsTxtRecordsContainToken([["abraxas-domain-verification=trusted-token"]], token)).toBe(true);
    expect(dnsTxtRecordsContainToken([["prefix-abraxas-domain-verification=trusted-token"]], token)).toBe(false);
  });

  it("requires a verified domain for an actual HTTPS callback", () => {
    expect(isVerifiedDomainForCallbacks({
      allowedReturnUrls: ["http://localhost:3000/callback", "https://partner.example.com/callback"],
      verifiedHostnames: ["partner.example.com"],
    })).toBe(true);
    expect(isVerifiedDomainForCallbacks({
      allowedReturnUrls: ["https://partner.example.com/callback"],
      verifiedHostnames: ["other.example.com"],
    })).toBe(false);
  });
});
