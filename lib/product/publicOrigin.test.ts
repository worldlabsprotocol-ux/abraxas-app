import { describe, expect, it } from "vitest";
import {
  ACCOUNT_ACCESS_FIRST_PAINT,
  PUBLIC_SURFACE_REDIRECTS,
  isPublicDemoRuntime,
  isPublicProductProduction,
  isPublicProductRequestHost,
} from "./publicOrigin";

describe("public origin helpers", () => {
  it("treats DEMO runtime as non-production even if Vercel env is production", () => {
    expect(isPublicDemoRuntime({ ABRAXAS_RUNTIME_ENV: "demo" })).toBe(true);
    expect(isPublicProductProduction({
      ABRAXAS_RUNTIME_ENV: "demo",
      VERCEL_ENV: "production",
    })).toBe(false);
  });

  it("treats Vercel production without demo runtime as the public product", () => {
    expect(isPublicProductProduction({ VERCEL_ENV: "production" })).toBe(true);
    expect(isPublicProductProduction({ ABRAXAS_RUNTIME_ENV: "production" })).toBe(true);
    expect(isPublicProductProduction({ VERCEL_ENV: "preview" })).toBe(false);
  });

  it("identifies the public product host", () => {
    expect(isPublicProductRequestHost(new Request("https://abraxasworld.xyz/judge-demo", {
      headers: { host: "abraxasworld.xyz" },
    }))).toBe(true);
    expect(isPublicProductRequestHost(new Request("https://demo.abraxasworld.xyz/judge-demo", {
      headers: { host: "demo.abraxasworld.xyz" },
    }))).toBe(false);
  });

  it("keeps account-access first paint free of identity-default language", () => {
    expect(ACCOUNT_ACCESS_FIRST_PAINT.toLowerCase()).toContain("account");
    expect(ACCOUNT_ACCESS_FIRST_PAINT.toLowerCase()).not.toContain("judge");
    expect(ACCOUNT_ACCESS_FIRST_PAINT.toLowerCase()).not.toContain("selfie");
  });

  it("redirects dead public routes to working starts", () => {
    expect(PUBLIC_SURFACE_REDIRECTS).toEqual([
      { source: "/partner", destination: "/docs/partner-flow" },
      { source: "/onboarding", destination: "/design-partner" },
    ]);
  });
});
