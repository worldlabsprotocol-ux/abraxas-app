import { describe, expect, it } from "vitest";
import { DOCS_HUB_GROUPS } from "@/lib/docs/docsHub";
import {
  PARTNER_FLOW_CANONICAL_HOST,
  buildPartnerFlowEntryUrl,
  PARTNER_FLOW_REDIRECT_EXAMPLE,
  PARTNER_FLOW_CALLBACK_VERIFY_EXAMPLE,
  INTEGRATION_PATH_DECISION_TREE,
  PARTNER_WEBHOOK_SANDBOX_EVENT_TYPE,
  PARTNER_WEBHOOK_LIFECYCLE_EVENT_TYPES,
  PARTNER_WEBHOOK_SANDBOX_GUIDE,
  PARTNER_WEBHOOK_SANDBOX_VS_LIFECYCLE_NOTE,
} from "@/lib/partner/partnerFlowIntegratorKit";
import { SITE_URL } from "@/lib/siteUrl";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("partnerFlowIntegratorKit", () => {
  it("uses canonical production host abraxasworld.xyz", () => {
    expect(PARTNER_FLOW_CANONICAL_HOST).toBe("https://abraxasworld.xyz");
    expect(SITE_URL).toBe("https://abraxasworld.xyz");
    const url = buildPartnerFlowEntryUrl({
      partnerId: "demo-partner",
      policyId: "demo-policy-v1",
      returnUrl: "https://partner.example.com/callback",
    });
    expect(url).toMatch(/^https:\/\/abraxasworld\.xyz\/partner\/verify\?/);
    expect(url).not.toContain("abraxas-app.vercel.app");
  });

  it("docs hub developer API topic links to partner-flow guide", () => {
    const developer = DOCS_HUB_GROUPS.find((g) => g.id === "developer");
    const api = developer?.topics.find((t) => t.id === "api");
    expect(api?.links?.some((l) => l.href === "/docs/partner-flow")).toBe(true);
    expect(api?.links?.some((l) => l.label === "Partner Flow")).toBe(true);
  });

  it("integration examples do not reference stale vercel preview host", () => {
    expect(PARTNER_FLOW_REDIRECT_EXAMPLE).not.toContain("abraxas-app.vercel.app");
    expect(PARTNER_FLOW_CALLBACK_VERIFY_EXAMPLE).not.toContain("abraxas-app.vercel.app");
    for (const path of INTEGRATION_PATH_DECISION_TREE) {
      if ("start" in path && typeof path.start === "string") {
        expect(path.start).not.toContain("abraxas-app.vercel.app");
      }
    }
  });

  it("examples/partner-flow-web-rp uses canonical host", () => {
    const readme = readFileSync(
      join(process.cwd(), "examples/partner-flow-web-rp/README.md"),
      "utf8",
    );
    const script = readFileSync(
      join(process.cwd(), "examples/partner-flow-web-rp/verify-callback.mjs"),
      "utf8",
    );
    expect(readme).toContain("https://abraxasworld.xyz");
    expect(readme).not.toContain("abraxas-app.vercel.app");
    expect(script).toContain("https://abraxasworld.xyz");
    expect(script).not.toContain("abraxas-app.vercel.app");
  });

  it("partner-flow docs page exists and references integrator kit headline", () => {
    const page = readFileSync(
      join(process.cwd(), "app/docs/partner-flow/page.tsx"),
      "utf8",
    );
    expect(page).toContain("partner-flow");
    expect(page).toContain("PARTNER_FLOW_HEADLINE");
    expect(page).toContain("PARTNER_FLOW_CANONICAL_HOST");
  });

  it("documents sandbox webhook test separately from lifecycle events", () => {
    expect(PARTNER_WEBHOOK_SANDBOX_EVENT_TYPE).toBe("partner.webhook.test");
    expect(PARTNER_WEBHOOK_LIFECYCLE_EVENT_TYPES).not.toContain("partner.webhook.test");
    expect(PARTNER_WEBHOOK_SANDBOX_GUIDE.endpoints.status).toBe("/api/partner/webhooks/status");
    expect(PARTNER_WEBHOOK_SANDBOX_GUIDE.endpoints.delivery_history).toBe("/api/v1/partner/webhooks/deliveries");
    expect(PARTNER_WEBHOOK_SANDBOX_GUIDE.endpoints.sandbox_test_enqueue).toBe("/api/partner/webhooks/test-delivery");
    expect(PARTNER_WEBHOOK_SANDBOX_VS_LIFECYCLE_NOTE).toContain("partner.webhook.test");

    const page = readFileSync(
      join(process.cwd(), "app/docs/partner-flow/page.tsx"),
      "utf8",
    );
    expect(page).toContain("PARTNER_WEBHOOK_SANDBOX_GUIDE.docsAnchor");
    expect(page).toContain("PARTNER_WEBHOOK_SANDBOX_GUIDE");
    expect(page).not.toContain("https://partner.example.com/webhook");
  });
});
