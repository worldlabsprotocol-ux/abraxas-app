import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { STARTER_KIT_PLACEHOLDERS, STARTER_KIT_RUNTIMES } from "@/lib/partner/starterKit/contract";
import { generateStarterKit } from "@/lib/partner/starterKit/generate";
import { validateStarterKitInput } from "@/lib/partner/starterKit/validate";
import { studioPayloadLeaks } from "@/lib/partner/integrationStudio/safety";
import {
  PARTNER_ACTIVATION_CREATE_CTA,
  PARTNER_ACTIVATION_PRODUCTION,
  buildPartnerActivationChecklist,
  launchpadResumeHref,
  launchpadSandboxTestHref,
  partnerActivationPublicView,
  selectLaunchpadResumeAppId,
} from "./contract";

function targetExists(href: string): boolean {
  const path = href.split("#")[0]?.split("?")[0] ?? href;
  if (path.startsWith("/api/")) return existsSync(join(process.cwd(), `app${path}/route.ts`));
  if (path === "/") return existsSync(join(process.cwd(), "app/page.tsx"));
  return existsSync(join(process.cwd(), `app${path}/page.tsx`));
}

describe("partner activation path", () => {
  it("exposes unsigned discovery without secrets or production issuance", async () => {
    const { GET } = await import("@/app/api/developers/integration-studio/route");
    const res = await GET(new NextRequest("http://localhost/api/developers/integration-studio"));
    expect(res.status).toBe(200);
    const json = await res.json() as {
      access: string;
      partner_session_required_for_provisioning: boolean;
      activation: ReturnType<typeof partnerActivationPublicView>;
      provision: { create_sandbox_cta: string };
    };
    expect(json.access).toBe("public");
    expect(json.partner_session_required_for_provisioning).toBe(true);
    expect(json.provision.create_sandbox_cta).toBe(PARTNER_ACTIVATION_CREATE_CTA);
    expect(json.activation.issues_production_key).toBe(false);
    expect(json.activation.identity_from).toBe("console_session");
    expect(JSON.stringify(json)).not.toMatch(/abx_test_|abx_live_/);
    expect(studioPayloadLeaks(json)).toEqual([]);
  });

  it("builds a starter kit for the selected runtime with placeholders only", () => {
    for (const runtime of STARTER_KIT_RUNTIMES) {
      const validated = validateStarterKitInput({
        pack_id: "age_21_retail",
        path: "hosted_partner_flow",
        runtime,
        capabilities: ["webhooks"],
      });
      expect(validated.ok, runtime).toBe(true);
      if (!validated.ok) continue;
      const kit = generateStarterKit(validated.selection);
      expect(kit.ok, runtime).toBe(true);
      if (!kit.ok) continue;
      const blob = kit.files.map((file) => file.contents).join("\n");
      expect(blob).toContain(STARTER_KIT_PLACEHOLDERS.api_key);
      expect(blob).not.toMatch(/abx_test_|abx_live_/);
      expect(kit.files.some((file) => file.path === ".env.example")).toBe(true);
    }
  });

  it("links every activation checklist item to a real page or kit file", () => {
    const items = buildPartnerActivationChecklist([
      "webhooks",
      "trading_venue",
      "payment_authorization",
      "wallet_standard_binding",
    ]);
    expect(items.map((item) => item.id)).toEqual([
      "allowlisted_callback",
      "hosted_partner_flow",
      "verify_receipt",
      "webhooks",
      "trading_preflight",
      "payment_preflight",
      "wallet_binding",
    ]);
    for (const item of items) {
      expect(targetExists(item.href), item.href).toBe(true);
    }
    const core = buildPartnerActivationChecklist([]);
    expect(core.some((item) => item.id === "webhooks")).toBe(false);
    expect(core.some((item) => item.id === "trading_preflight")).toBe(false);
  });

  it("resumes the requested sandbox app and falls back to the first tenant app", () => {
    const apps = [{ id: "app-a" }, { id: "app-b" }];
    expect(selectLaunchpadResumeAppId(apps, "app-b")).toBe("app-b");
    expect(selectLaunchpadResumeAppId(apps, "other-tenant-app")).toBe("app-a");
    expect(selectLaunchpadResumeAppId([], "app-a")).toBeNull();
    expect(launchpadResumeHref("app-b")).toBe("/developers/launchpad?app=app-b");
    expect(launchpadResumeHref()).toBe("/developers/launchpad");
    expect(launchpadSandboxTestHref("app-b")).toBe("/developers/launchpad?app=app-b&view=test");
  });

  it("denies production on this path and keeps placeholders in the public view", () => {
    const view = partnerActivationPublicView();
    expect(view.production).toEqual(PARTNER_ACTIVATION_PRODUCTION);
    expect(view.placeholders.api_key).toBe("YOUR_SANDBOX_API_KEY");
    expect(view.moves_funds).toBe(false);
  });
});
