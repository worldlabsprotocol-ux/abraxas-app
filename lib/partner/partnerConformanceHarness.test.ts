import { describe, expect, it, vi } from "vitest";
import { buildPartnerFlowCompatibilityManifest } from "@/lib/protocol/partnerFlowCompatibilityManifest";
import {
  formatConformanceReport,
  runPartnerConformance,
} from "@/lib/partner/partnerConformanceHarness";
import { SITE_URL } from "@/lib/siteUrl";

const GENERIC_OPTIONS = {
  baseUrl: SITE_URL,
  partnerId: "acme-protocol",
  policyId: "acme-gate-v1",
  returnUrl: "https://app.acme.example/auth/abraxas/callback",
  productionMode: true,
  allowSandbox: true,
  skipLiveManifest: false,
};

function manifestFetchMock(manifest = buildPartnerFlowCompatibilityManifest(SITE_URL)) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/api/protocol/compatibility")) {
      return new Response(JSON.stringify(manifest), { status: 200 });
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;
}

describe("runPartnerConformance", () => {
  it("passes fixture and live manifest checks for generic partner config", async () => {
    const result = await runPartnerConformance(GENERIC_OPTIONS, {
      fetch: manifestFetchMock(),
    });

    expect(result.exitCode).toBe(0);
    expect(result.summary.fail).toBe(0);
    expect(result.checks.find(c => c.id === "conformance-config")?.status).toBe("pass");
    expect(result.checks.find(c => c.id === "conformance-receipt-fail-closed-fixtures")?.status).toBe(
      "pass",
    );
    expect(
      result.checks.find(c => c.id === "conformance-compatibility-manifest-contract")?.status,
    ).toBe("pass");
  });

  it("fails when compatibility manifest version drifts", async () => {
    const drifted = { ...buildPartnerFlowCompatibilityManifest(SITE_URL), compatibility_version: "9.9.9" };
    const result = await runPartnerConformance(GENERIC_OPTIONS, {
      fetch: manifestFetchMock(drifted),
    });

    expect(result.exitCode).toBe(1);
    expect(
      result.checks.find(c => c.id === "conformance-compatibility-manifest-contract")?.status,
    ).toBe("fail");
  });

  it("fails callback URL validation for stale host", async () => {
    const result = await runPartnerConformance(
      {
        ...GENERIC_OPTIONS,
        returnUrl: "https://abraxas-app.vercel.app/callback",
      },
      { fetch: manifestFetchMock() },
    );

    expect(result.checks.find(c => c.id === "conformance-callback-url-format")?.status).toBe("fail");
    expect(result.exitCode).toBe(1);
  });

  it("marks live manifest checks pending when base URL is unset", async () => {
    const result = await runPartnerConformance(
      {
        ...GENERIC_OPTIONS,
        baseUrl: "",
        productionMode: false,
        skipLiveManifest: true,
      },
      { fetch: manifestFetchMock() },
    );

    expect(result.checks.find(c => c.id === "conformance-receipt-fail-closed-fixtures")?.status).toBe(
      "pass",
    );
    expect(
      result.checks.find(c => c.id === "conformance-compatibility-manifest-endpoint")?.status,
    ).toBe("pending");
    expect(result.exitCode).toBe(0);
  });

  it("fails when required config is incomplete", async () => {
    const result = await runPartnerConformance(
      {
        ...GENERIC_OPTIONS,
        partnerId: "",
        returnUrl: "",
      },
      { fetch: manifestFetchMock() },
    );

    expect(result.checks.find(c => c.id === "conformance-config")?.status).toBe("fail");
    expect(result.exitCode).toBe(1);
  });

  it("formats PASS/FAIL/PENDING report output", async () => {
    const result = await runPartnerConformance(GENERIC_OPTIONS, {
      fetch: manifestFetchMock(),
    });
    const report = formatConformanceReport(result);
    expect(report).toContain("=== Abraxas partner conformance harness ===");
    expect(report).toContain("PASS");
    expect(report).toContain("partner_id: acme-protocol");
  });
});
