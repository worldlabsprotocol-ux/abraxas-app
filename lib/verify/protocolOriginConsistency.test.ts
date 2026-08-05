// FILE: lib/verify/protocolOriginConsistency.test.ts
// Regression: external protocol URLs use trusted canonical origins, never stale Vercel fallbacks.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildVerifyAuthorizationUrl } from "@/lib/verify/authorize";
import { buildHostedConnectAuthorizeUrl } from "@/lib/connect/authorizationService";
import {
  buildPresentationRequest,
  presentationRequestUrl,
} from "@/lib/openid4vp/presentation";
import {
  getPublicAppOriginFromRequest,
  getSdkDefaultBaseUrl,
  resolveProtocolAppOrigin,
} from "@/lib/app/publicAppOrigin";
import { SITE_URL } from "@/lib/siteUrl";
import { GOOD_TROUBLE_PARTNER_ID, GOOD_TROUBLE_RETAIL_POLICY_ID } from "@/lib/goodTrouble/constants";

const STALE_HOST = "abraxas-app.vercel.app";
const ENV_KEYS = ["NEXT_PUBLIC_APP_URL", "ABRAXAS_ISSUER_URL", "VERCEL_URL"] as const;
const savedEnv: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

function clearOriginEnv() {
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
}

function restoreOriginEnv() {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
}

describe("protocol canonical origin consistency", () => {
  beforeEach(() => clearOriginEnv());
  afterEach(() => restoreOriginEnv());

  it("resolveProtocolAppOrigin defaults to canonical production URL", () => {
    expect(resolveProtocolAppOrigin()).toBe(SITE_URL);
    expect(getSdkDefaultBaseUrl()).toBe(SITE_URL);
    expect(resolveProtocolAppOrigin()).not.toContain(STALE_HOST);
  });

  it("uses configured preview origin when NEXT_PUBLIC_APP_URL is set", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://preview.example.com/";
    expect(resolveProtocolAppOrigin()).toBe("https://preview.example.com");
  });

  it("uses configured Vercel preview host via VERCEL_URL", () => {
    process.env.VERCEL_URL = "abraxas-app-preview.vercel.app";
    expect(resolveProtocolAppOrigin()).toBe("https://abraxas-app-preview.vercel.app");
    expect(resolveProtocolAppOrigin()).not.toContain(STALE_HOST);
  });

  it("prefers explicit appOrigin override for protocol URL builders", () => {
    const local = "http://localhost:3000";
    expect(resolveProtocolAppOrigin(local)).toBe(local);
  });

  describe("Abraxas Verify authorize URLs", () => {
    it("buildVerifyAuthorizationUrl uses canonical origin by default", () => {
      const url = buildVerifyAuthorizationUrl({
        relyingPartyId: GOOD_TROUBLE_PARTNER_ID,
        permission: "regulated_purchase",
        permissionVersion: "v1",
        policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
        redirectUri: `${SITE_URL}/good-trouble/enter`,
      });
      expect(url.startsWith(`${SITE_URL}/partner/verify?`)).toBe(true);
      expect(url).not.toContain(STALE_HOST);
    });

    it("honors trusted request origin when passed as appOrigin", () => {
      const url = buildVerifyAuthorizationUrl({
        relyingPartyId: GOOD_TROUBLE_PARTNER_ID,
        permission: "regulated_purchase",
        permissionVersion: "v1",
        policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
        redirectUri: `${SITE_URL}/good-trouble/enter`,
        appOrigin: SITE_URL,
      });
      expect(new URL(url).origin).toBe(SITE_URL);
    });
  });

  describe("Abraxas Connect hosted authorize URLs", () => {
    it("buildHostedConnectAuthorizeUrl uses canonical origin by default", () => {
      const url = buildHostedConnectAuthorizeUrl("car_test_001");
      expect(url).toBe(`${SITE_URL}/connect/authorize?request=car_test_001`);
      expect(url).not.toContain(STALE_HOST);
    });
  });

  describe("OpenID4VP presentation URLs", () => {
    it("buildPresentationRequest and presentationRequestUrl use canonical origins", () => {
      const req = buildPresentationRequest({
        partnerId: GOOD_TROUBLE_PARTNER_ID,
        policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
        requestedClaims: ["identity_verified"],
      });
      expect(req.client_id).toBe(`${SITE_URL}/integrations`);
      expect(req.client_id).not.toContain(STALE_HOST);

      const presUrl = presentationRequestUrl(req);
      expect(presUrl).toContain(
        encodeURIComponent(`${SITE_URL}/api/openid4vp/request/${req.request_id}`),
      );
      expect(presUrl).not.toContain(STALE_HOST);
    });
  });

  describe("malicious forwarded-host rejection", () => {
    it("getPublicAppOriginFromRequest never returns attacker origin", () => {
      process.env.NEXT_PUBLIC_APP_URL = SITE_URL;
      const origin = getPublicAppOriginFromRequest({
        headers: new Headers({
          host: "abraxasworld.xyz",
          "x-forwarded-host": "evil.example",
          "x-forwarded-proto": "https",
        }),
      });
      expect(origin).toBe(SITE_URL);
      expect(origin).not.toContain("evil.example");
      expect(origin).not.toContain(STALE_HOST);

      const url = buildVerifyAuthorizationUrl({
        relyingPartyId: GOOD_TROUBLE_PARTNER_ID,
        permission: "regulated_purchase",
        permissionVersion: "v1",
        policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
        redirectUri: `${SITE_URL}/good-trouble/enter`,
        appOrigin: origin,
      });
      expect(new URL(url).origin).toBe(SITE_URL);
    });
  });

  it("scoped protocol modules contain no stale host string literals", () => {
    const files = [
      "lib/verify/authorize.ts",
      "lib/connect/authorizationService.ts",
      "lib/openid4vp/presentation.ts",
    ];
    for (const file of files) {
      const src = readFileSync(join(process.cwd(), file), "utf8");
      expect(src, file).not.toContain(STALE_HOST);
    }
  });
});
