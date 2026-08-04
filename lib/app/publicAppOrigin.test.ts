import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getPublicAppOrigin, getPublicAppOriginFromRequest } from "@/lib/app/publicAppOrigin";
import {
  buildPartnerVerifyUrl,
  resolvePartnerReturnUrl,
} from "@/lib/partner/referenceIntegration";
import { GOOD_TROUBLE_INTEGRATION } from "@/lib/goodTrouble/partnerIntegration";

describe("publicAppOrigin — partner flow same-origin", () => {
  const CANONICAL = "https://abraxasworld.xyz";
  const PREVIEW = "https://abraxas-app-preview.vercel.app";
  const LOCAL = "http://localhost:3000";

  const envKeys = [
    "NEXT_PUBLIC_APP_URL",
    "ABRAXAS_ISSUER_URL",
    "VERCEL_URL",
  ] as const;

  const savedEnv: Partial<Record<typeof envKeys[number], string | undefined>> = {};

  beforeEach(() => {
    for (const key of envKeys) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of envKeys) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
  });

  it("buildPartnerVerifyUrl keeps partner verify and return URL on the same origin", () => {
    const url = buildPartnerVerifyUrl(GOOD_TROUBLE_INTEGRATION, { origin: CANONICAL });
    const parsed = new URL(url);

    expect(parsed.origin).toBe(CANONICAL);
    expect(parsed.pathname).toBe("/partner/verify");

    const returnUrl = parsed.searchParams.get("return_url");
    expect(returnUrl).toBe(`${CANONICAL}/good-trouble/enter`);
    expect(new URL(returnUrl!).origin).toBe(CANONICAL);
  });

  it("resolvePartnerReturnUrl uses enter path on the provided origin", () => {
    expect(resolvePartnerReturnUrl(GOOD_TROUBLE_INTEGRATION, CANONICAL)).toBe(
      `${CANONICAL}/good-trouble/enter`,
    );
  });

  it("getPublicAppOriginFromRequest maps canonical production host to canonical origin", () => {
    const origin = getPublicAppOriginFromRequest({
      headers: new Headers({
        host: "abraxasworld.xyz",
      }),
    });
    expect(origin).toBe(CANONICAL);
  });

  it("getPublicAppOriginFromRequest maps valid Vercel preview host to preview origin", () => {
    process.env.VERCEL_URL = "abraxas-app-preview.vercel.app";

    const origin = getPublicAppOriginFromRequest({
      headers: new Headers({
        host: "abraxas-app-preview.vercel.app",
        "x-forwarded-proto": "https",
      }),
    });
    expect(origin).toBe(PREVIEW);
  });

  it("getPublicAppOriginFromRequest maps localhost development host to local origin", () => {
    const origin = getPublicAppOriginFromRequest({
      headers: new Headers({
        host: "localhost:3000",
      }),
    });
    expect(origin).toBe(LOCAL);
  });

  it("getPublicAppOriginFromRequest never emits attacker-controlled origins from forwarded headers", () => {
    process.env.NEXT_PUBLIC_APP_URL = CANONICAL;

    const maliciousOrigins = [
      "https://evil.example",
      "http://evil.example",
      "https://attacker.test",
      "http://phish.local",
    ];

    const cases: Array<{ headers: Record<string, string>; label: string }> = [
      {
        label: "malicious x-forwarded-host",
        headers: {
          host: "abraxasworld.xyz",
          "x-forwarded-host": "evil.example",
          "x-forwarded-proto": "https",
        },
      },
      {
        label: "malicious x-forwarded-proto only",
        headers: {
          host: "abraxasworld.xyz",
          "x-forwarded-proto": "http",
        },
      },
      {
        label: "malicious x-forwarded-host and proto",
        headers: {
          "x-forwarded-host": "attacker.test",
          "x-forwarded-proto": "https",
        },
      },
      {
        label: "malicious host with no trusted fallback host",
        headers: {
          host: "evil.example",
          "x-forwarded-host": "evil.example",
          "x-forwarded-proto": "https",
        },
      },
    ];

    for (const { headers, label } of cases) {
      const origin = getPublicAppOriginFromRequest({ headers: new Headers(headers) });
      expect(maliciousOrigins, `${label}: ${origin}`).not.toContain(origin);
      expect(origin).toBe(CANONICAL);
    }
  });

  it("getPublicAppOrigin falls back to configured public origin when request host is untrusted", () => {
    process.env.NEXT_PUBLIC_APP_URL = CANONICAL;

    expect(
      getPublicAppOriginFromRequest({
        headers: new Headers({
          host: "totally-unknown.example",
          "x-forwarded-host": "totally-unknown.example",
          "x-forwarded-proto": "https",
        }),
      }),
    ).toBe(CANONICAL);

    expect(getPublicAppOrigin()).toBe(CANONICAL);
  });
});
