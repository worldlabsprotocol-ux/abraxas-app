import { describe, expect, it } from "vitest";
import {
  buildReferenceVerifyUrl,
  REFERENCE_RP_ENV_KEYS,
  resolveReferenceRelyingPartyConfig,
  validatePartnerReturnUrlFormat,
} from "@/lib/partner/referenceRelyingPartyConfig";
import { SITE_URL } from "@/lib/siteUrl";

describe("resolveReferenceRelyingPartyConfig", () => {
  it("requires partner, policy, and return URL from environment", () => {
    const result = resolveReferenceRelyingPartyConfig({});
    expect(result.config).toBeNull();
    expect(result.missing).toEqual([
      REFERENCE_RP_ENV_KEYS.partnerId,
      REFERENCE_RP_ENV_KEYS.policyId,
      REFERENCE_RP_ENV_KEYS.returnUrl,
    ]);
  });

  it("builds generic config without Good Trouble defaults", () => {
    const result = resolveReferenceRelyingPartyConfig({
      [REFERENCE_RP_ENV_KEYS.partnerId]: "acme-protocol",
      [REFERENCE_RP_ENV_KEYS.policyId]: "acme-gate-v1",
      [REFERENCE_RP_ENV_KEYS.returnUrl]: "https://app.acme.example/auth/abraxas/callback",
      [REFERENCE_RP_ENV_KEYS.baseUrl]: SITE_URL,
      [REFERENCE_RP_ENV_KEYS.displayName]: "Acme Protocol",
    });

    expect(result.config).toEqual({
      baseUrl: SITE_URL,
      partnerId: "acme-protocol",
      policyId: "acme-gate-v1",
      returnUrl: "https://app.acme.example/auth/abraxas/callback",
      displayName: "Acme Protocol",
    });
  });

  it("builds verify URL from generic config", () => {
    const { config } = resolveReferenceRelyingPartyConfig({
      [REFERENCE_RP_ENV_KEYS.partnerId]: "acme-protocol",
      [REFERENCE_RP_ENV_KEYS.policyId]: "acme-gate-v1",
      [REFERENCE_RP_ENV_KEYS.returnUrl]: "https://app.acme.example/auth/abraxas/callback",
      [REFERENCE_RP_ENV_KEYS.baseUrl]: SITE_URL,
    });
    expect(config).not.toBeNull();
    const url = buildReferenceVerifyUrl(config!);
    expect(url).toContain("partner_id=acme-protocol");
    expect(url).toContain("policy_id=acme-gate-v1");
    expect(url).toContain(encodeURIComponent("https://app.acme.example/auth/abraxas/callback"));
    expect(url).not.toContain("good-trouble");
  });
});

describe("validatePartnerReturnUrlFormat", () => {
  it("accepts canonical HTTPS callback URLs", () => {
    const result = validatePartnerReturnUrlFormat(
      "https://app.acme.example/auth/abraxas/callback",
    );
    expect(result.ok).toBe(true);
  });

  it("rejects stale Vercel host in callback URL", () => {
    const result = validatePartnerReturnUrlFormat(
      "https://abraxas-app.vercel.app/good-trouble/enter",
    );
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("return_url_contains_stale_vercel_host");
  });

  it("rejects callback URLs with query strings", () => {
    const result = validatePartnerReturnUrlFormat(
      "https://app.acme.example/callback?state=1",
    );
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("return_url_must_not_include_query_or_fragment");
  });
});
