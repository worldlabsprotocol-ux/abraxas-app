import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { POLICY_PACK_LIST } from "@/lib/partner/launchpad/policyPacks";
import { GET } from "@/app/api/developers/integration-studio/route";
import {
  INTEGRATION_STUDIO_CHECKLIST,
  INTEGRATION_STUDIO_PATH,
  INTEGRATION_STUDIO_PROVISION,
  studioPackContract,
  studioPayloadLeaks,
  studioPublicCatalog,
  studioSnippetForPath,
} from "@/lib/partner/integrationStudio";

describe("Integration Studio", () => {
  it("renders every existing policy pack with a withheld list and Google account boundary", () => {
    for (const pack of POLICY_PACK_LIST) {
      const contract = studioPackContract(pack.id);
      expect(contract?.pack_id).toBe(pack.id);
      expect(contract?.disclosed_result).toBe(pack.disclosed_result);
      expect(contract?.withheld.length).toBeGreaterThan(0);
      expect(contract?.identity_is_default).toBe(false);
      expect(contract?.google_is_account_only.toLowerCase()).toContain("account");
      expect(contract?.methods.some((method) => method.id === "account_login" && method.qualifies === false)).toBe(true);
    }
  });

  it("keeps identity or liveness off the default path unless that pack requires it", () => {
    const retail = studioPackContract("age_21_retail");
    const identity = studioPackContract("identity_liveness");
    expect(retail?.methods.find((method) => method.id === "identity_liveness")?.primary).toBe(false);
    expect(identity?.methods.find((method) => method.id === "identity_liveness")?.qualifies).toBe(true);
    expect(identity?.identity_is_default).toBe(false);
  });

  it("exposes the real checklist and self-service sandbox copy", () => {
    expect(INTEGRATION_STUDIO_CHECKLIST.map((item) => item.id)).toEqual([
      "hosted_verify",
      "approved_receipt",
      "server_verification",
      "expiry_revocation",
      "webhook_verification",
      "policy_version",
    ]);
    expect(INTEGRATION_STUDIO_PROVISION.requires_partner_session).toBe(true);
    expect(INTEGRATION_STUDIO_PROVISION.self_serve_sandbox).toBe(true);
    expect(INTEGRATION_STUDIO_PROVISION.self_serve_production).toBe(false);
    expect(INTEGRATION_STUDIO_PROVISION.create_sandbox_cta).toBe("Create a sandbox integration");
    expect(INTEGRATION_STUDIO_PROVISION.production_upgrade_cta).toBe(
      "Upgrade to Production after readiness review",
    );
    expect(INTEGRATION_STUDIO_PROVISION.notice.toLowerCase()).toContain("shown once");
  });

  it("reuses kit, webhook, and Solana snippets without fund movement or secrets", () => {
    const hosted = studioSnippetForPath("hosted_partner_flow").code;
    const verify = studioSnippetForPath("server_receipt_verify").code;
    const webhook = studioSnippetForPath("webhook_events").code;
    const solana = studioSnippetForPath("solana_gate").code;
    expect(hosted).toContain("AbraxasPartnerKit");
    expect(verify).toContain("verifyCallback");
    expect(webhook).toContain("verifyPartnerWebhookEvent");
    expect(solana).toContain("AbraxasSolanaPartnerAdapter");
    expect(solana).not.toMatch(/createTransaction|sendAndConfirm|mintTo/);
    const catalog = studioPublicCatalog({ pathId: "solana_gate" });
    expect(catalog.solana.creates_transactions).toBe(false);
    expect(catalog.solana.funds_movement).toBe(false);
    expect(studioPayloadLeaks({ hosted, verify, webhook, solana, catalog })).toEqual([]);
  });

  it("serves a public catalog with a safe response shape", async () => {
    const res = await GET(new NextRequest("http://localhost/api/developers/integration-studio?pack=age_21_retail&path=solana_gate"));
    expect(res.status).toBe(200);
    const json = await res.json() as {
      access: string;
      partner_session_required_for_provisioning: boolean;
      contract: { pack_id: string };
      solana: { funds_movement: boolean };
    };
    expect(json.access).toBe("public");
    expect(json.partner_session_required_for_provisioning).toBe(true);
    expect((json as { provision: { create_sandbox_cta: string; self_serve_production: boolean } }).provision.create_sandbox_cta)
      .toBe("Create a sandbox integration");
    expect((json as { provision: { create_sandbox_cta: string; self_serve_production: boolean } }).provision.self_serve_production)
      .toBe(false);
    expect(json.contract.pack_id).toBe("age_21_retail");
    expect(json.solana.funds_movement).toBe(false);
    expect(studioPayloadLeaks(json)).toEqual([]);
    expect(JSON.stringify(json).toLowerCase()).not.toContain("judge");
  });

  it("rejects unknown packs and paths", async () => {
    const pack = await GET(new NextRequest("http://localhost/api/developers/integration-studio?pack=not-a-pack"));
    expect(pack.status).toBe(400);
    const path = await GET(new NextRequest("http://localhost/api/developers/integration-studio?path=mint_token"));
    expect(path.status).toBe(400);
  });

  it("is a public RedesignPage and is linked from developer navigation", () => {
    const page = readFileSync(join(process.cwd(), "app/developers/integration-studio/page.tsx"), "utf8");
    expect(page).toContain("RedesignPage");
    expect(page).not.toContain("judge");
    const developers = readFileSync(join(process.cwd(), "app/developers/page.tsx"), "utf8");
    expect(developers).toContain(INTEGRATION_STUDIO_PATH);
    const client = readFileSync(join(process.cwd(), "app/developers/integration-studio/IntegrationStudioClient.tsx"), "utf8");
    expect(client).toContain("Create a sandbox integration");
    expect(client).toContain("Upgrade to Production after readiness review");
    expect(client.toLowerCase()).not.toContain("operator-issued");
    expect(client.toLowerCase()).not.toContain("operator issued");
  });
});
