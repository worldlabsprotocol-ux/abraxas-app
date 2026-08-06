import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildPartnerFlowCompatibilityManifest } from "@/lib/protocol/partnerFlowCompatibilityManifest";
import {
  formatIatAutomatedConsoleReport,
  runIatAutomated,
  type IatAutomatedDeps,
} from "@/lib/iat/iatAutomatedRunner";
import { formatIatAutomatedJson, formatIatAutomatedMarkdown } from "@/lib/iat/iatReport";
import { emptyScenarioAEvidenceTemplate, SCENARIO_A_HUMAN_STEPS } from "@/lib/iat/iatScenarioAEvidence";
import { resolveIatAutomatedOptions } from "@/lib/iat/iatAutomatedConfig";
import { SITE_URL } from "@/lib/siteUrl";
import {
  GOOD_TROUBLE_PARTNER_ID,
  GOOD_TROUBLE_RETAIL_POLICY_ID,
} from "@/lib/goodTrouble/constants";

const ROOT = process.cwd();
const RETURN_URL = `${SITE_URL}/good-trouble/enter`;

function baseDeps(fetchMock: typeof fetch): IatAutomatedDeps {
  return {
    fetch: fetchMock,
    env: {},
    readFile: path => readFileSync(path, "utf8"),
    fileExists: path => {
      try {
        readFileSync(path);
        return true;
      } catch {
        return false;
      }
    },
    now: () => new Date("2026-08-06T01:00:00.000Z"),
  };
}

function productionFetchMock(overrides: { gtHtml?: string; manifest?: unknown } = {}) {
  const manifest = overrides.manifest ?? buildPartnerFlowCompatibilityManifest(SITE_URL);
  const gtHtml =
    overrides.gtHtml ??
    '<a href="/partner/verify?partner_id=good-trouble-cannabis">Continue with Abraxas</a>';

  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/api/protocol/compatibility")) {
      return new Response(JSON.stringify(manifest), { status: 200 });
    }
    if (url.includes("/api/trust/status")) {
      return new Response(
        JSON.stringify({ infrastructure: { signing_configured: true } }),
        { status: 200 },
      );
    }
    if (url.endsWith("/api/credentials/public-key")) {
      return new Response(JSON.stringify({ issuer: SITE_URL }), { status: 200 });
    }
    if (url.endsWith("/openapi/partner-flow.openapi.yaml")) {
      return new Response(
        readFileSync(join(ROOT, "public/openapi/partner-flow.openapi.yaml"), "utf8"),
        { status: 200 },
      );
    }
    if (url.includes("/api/v1/partner-flow/")) {
      return new Response(JSON.stringify({ error: "Sign in required in this browser" }), {
        status: 401,
      });
    }
    if (url.includes("/good-trouble") && !url.includes("/enter")) {
      return new Response(gtHtml, { status: 200, headers: { "Content-Type": "text/html" } });
    }
    return new Response("<html>ok</html>", { status: 200, headers: { "Content-Type": "text/html" } });
  }) as typeof fetch;
}

describe("resolveIatAutomatedOptions", () => {
  it("defaults base URL to canonical production host", () => {
    const opts = resolveIatAutomatedOptions({ IAT_BASE_URL: "https://abraxasworld.xyz" });
    expect(opts.baseUrl).toBe(SITE_URL);
    expect(opts.partnerId).toBe(GOOD_TROUBLE_PARTNER_ID);
    expect(opts.policyId).toBe(GOOD_TROUBLE_RETAIL_POLICY_ID);
  });
});

describe("runIatAutomated", () => {
  const options = {
    baseUrl: SITE_URL,
    partnerId: GOOD_TROUBLE_PARTNER_ID,
    policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
    returnUrl: RETURN_URL,
    productionMode: true,
    reportDir: "reports/iat-automated",
  };

  it("reports PASS for production-safe automated checks", async () => {
    const result = await runIatAutomated(options, baseDeps(productionFetchMock()), ROOT);

    expect(result.summary.fail).toBe(0);
    expect(result.exitCode).toBe(0);
    expect(result.checks.find(c => c.id === "iat-receipt-validation-contract")?.status).toBe("pass");
    expect(result.checks.find(c => c.id === "iat-integration-preflight")?.status).toBe("pass");
    expect(result.checks.find(c => c.id === "iat-scenario-a-human-execution")?.status).toBe(
      "human_required",
    );
  });

  it("fails when compatibility manifest version drifts", async () => {
    const drifted = { ...buildPartnerFlowCompatibilityManifest(SITE_URL), compatibility_version: "9.9.9" };
    const result = await runIatAutomated(
      options,
      baseDeps(productionFetchMock({ manifest: drifted })),
      ROOT,
    );

    expect(result.summary.fail).toBeGreaterThan(0);
    expect(result.exitCode).toBe(1);
    expect(
      result.checks.find(c => c.id === "iat-compatibility-manifest-contract")?.status,
    ).toBe("fail");
  });

  it("fails when Good Trouble checkout button is missing", async () => {
    const result = await runIatAutomated(
      options,
      baseDeps(productionFetchMock({ gtHtml: "<html>no button</html>" })),
      ROOT,
    );

    expect(result.checks.find(c => c.id === "iat-good-trouble-checkout")?.status).toBe("fail");
    expect(result.exitCode).toBe(1);
  });

  it("fails when signing is not configured in production mode", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/trust/status")) {
        return new Response(
          JSON.stringify({ infrastructure: { signing_configured: false } }),
          { status: 200 },
        );
      }
      return productionFetchMock()(input);
    }) as typeof fetch;

    const result = await runIatAutomated(options, baseDeps(fetchMock), ROOT);
    expect(result.checks.find(c => c.id === "iat-trust-signing")?.status).toBe("fail");
    expect(result.exitCode).toBe(1);
  });

  it("includes Scenario A human steps in report output", async () => {
    const result = await runIatAutomated(options, baseDeps(productionFetchMock()), ROOT);
    const scenarioA = emptyScenarioAEvidenceTemplate();
    const md = formatIatAutomatedMarkdown(result, scenarioA);
    const json = JSON.parse(formatIatAutomatedJson(result, scenarioA));

    expect(md).toContain("does NOT claim full IAT completion");
    expect(md).toContain("Scenario A steps still requiring a human");
    expect(md).toContain("Sign in with Google (zkLogin session cookie)");
    expect(json.iat_pass_claimed).toBe(false);
    expect(json.scenario_a_evidence_template.human_steps_required).toHaveLength(
      SCENARIO_A_HUMAN_STEPS.length,
    );
    expect(json.scenario_a_evidence_template.fields.verification_request_id).toBeNull();
  });

  it("formats console report with HUMAN_REQUIRED status", async () => {
    const result = await runIatAutomated(options, baseDeps(productionFetchMock()), ROOT);
    const report = formatIatAutomatedConsoleReport(result);
    expect(report).toContain("HUMAN_REQUIRED");
    expect(report).toContain("IAT pass claimed: NO");
  });
});
