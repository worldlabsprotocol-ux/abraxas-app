// FILE: lib/admin/partnerFlowProductionRouteGate.test.ts

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { NextRequest } from "next/server";
import { SITE_URL } from "@/lib/siteUrl";
import { DEMO_SANDBOX_APP_ORIGIN } from "@/lib/demo/partnerSandboxDemoEnvironmentGuard";
import {
  guardPartnerFlowProductionReadinessRoute,
  isPartnerFlowProductionReadinessOrigin,
} from "@/lib/admin/partnerFlowProductionRouteGate";

describe("partnerFlowProductionRouteGate", () => {
  it("allows only the canonical Production configured origin", () => {
    expect(
      isPartnerFlowProductionReadinessOrigin({
        NODE_ENV: "production",
        NEXT_PUBLIC_APP_URL: SITE_URL,
      }),
    ).toBe(true);
  });

  it("blocks the demo sandbox origin even when demo flag is enabled", () => {
    expect(
      isPartnerFlowProductionReadinessOrigin({
        NODE_ENV: "production",
        PARTNER_SANDBOX_DEMO_ENABLED: "true",
        NEXT_PUBLIC_APP_URL: DEMO_SANDBOX_APP_ORIGIN,
      }),
    ).toBe(false);
  });

  it("blocks preview and unknown production-like origins", () => {
    expect(
      isPartnerFlowProductionReadinessOrigin({
        NODE_ENV: "production",
        NEXT_PUBLIC_APP_URL: "https://preview-branch.vercel.app",
      }),
    ).toBe(false);

    expect(
      isPartnerFlowProductionReadinessOrigin({
        NODE_ENV: "production",
        NEXT_PUBLIC_APP_URL: "https://staging.example.com",
      }),
    ).toBe(false);
  });

  it("blocks missing and invalid configured origins in production", () => {
    expect(
      isPartnerFlowProductionReadinessOrigin({
        NODE_ENV: "production",
      }),
    ).toBe(false);

    expect(
      isPartnerFlowProductionReadinessOrigin({
        NODE_ENV: "production",
        NEXT_PUBLIC_APP_URL: "not-a-valid-origin",
      }),
    ).toBe(false);
  });

  it("blocks local development and test fallbacks", () => {
    expect(
      isPartnerFlowProductionReadinessOrigin({
        NODE_ENV: "development",
      }),
    ).toBe(false);

    expect(
      isPartnerFlowProductionReadinessOrigin({
        NODE_ENV: "test",
      }),
    ).toBe(false);
  });

  it("returns 404 before auth on non-Production configured origins", async () => {
    const req = new NextRequest("http://localhost/api/admin/partner-flow/signing-health");
    const blocked = guardPartnerFlowProductionReadinessRoute(req);
    expect(blocked?.status).toBe(404);
    const body = await blocked!.json() as { error?: string };
    expect(body.error).toBe("Not found");
  });

  it("does not consult request Host headers", () => {
    const source = readFileSync(
      resolve(__dirname, "partnerFlowProductionRouteGate.ts"),
      "utf8",
    );
    expect(source).not.toContain('headers.get("host")');
    expect(source).not.toContain("headers.get('host')");
  });
});
