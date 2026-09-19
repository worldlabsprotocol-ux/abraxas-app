// FILE: lib/partner/starterKit/starterKit.test.ts

import { describe, expect, it } from "vitest";
import { INTEGRATION_STUDIO_PATHS } from "@/lib/partner/integrationStudio/contract";
import { generateStarterKit } from "./generate";
import { validateStarterKitInput } from "./validate";
import { STARTER_KIT_DOES_NOT_DO, STARTER_KIT_RUNTIMES } from "./contract";
import { studioPayloadLeaks } from "@/lib/partner/integrationStudio/safety";

const FORBIDDEN = /createTransfer|createCharge|confirm_testnet_transfer|signTransaction|placeOrder|sendAndConfirm|mintTo|abx_live_|wallet_address|legal_name|date_of_birth/;

function serverSideProof(files: Array<{ path: string; contents: string }>): boolean {
  return files.some((file) =>
    !file.path.startsWith("src/pages/")
    && (file.contents.includes("permitProtocolAction") || file.contents.includes("verifyReceiptId") || file.contents.includes("verifyCallback")),
  );
}

describe("Partner Starter Kit Generator", () => {
  it("renders every integration path for every runtime with server-side verification", () => {
    for (const path of INTEGRATION_STUDIO_PATHS) {
      for (const runtime of STARTER_KIT_RUNTIMES) {
        const validated = validateStarterKitInput({
          pack_id: "age_21_retail",
          path,
          runtime,
          capabilities: [],
        });
        expect(validated.ok, `${runtime} ${path}`).toBe(true);
        if (!validated.ok) continue;
        const kit = generateStarterKit(validated.selection);
        expect(kit.ok, `${runtime} ${path}`).toBe(true);
        if (!kit.ok) continue;
        const names = kit.files.map((file) => file.path);
        expect(names).toContain("README.md");
        expect(names).toContain(".env.example");
        expect(kit.filename.endsWith(".zip")).toBe(true);
        expect(kit.manifest.length).toBe(kit.files.length);
        expect(kit.archive_base64.startsWith("UEs")).toBe(true);
        expect(serverSideProof(kit.files)).toBe(true);
        expect(kit.files.some((file) => file.contents.includes("currently_valid") || file.path.includes("fixture"))).toBe(true);
        const code = kit.files
          .filter((file) => /\.(ts|js|mjs)$/.test(file.path))
          .map((file) => file.contents)
          .join("\n");
        expect(code).not.toMatch(FORBIDDEN);
        expect(studioPayloadLeaks({ ...kit, archive_base64: "" })).toEqual([]);
      }
    }
  });

  it("keeps Wix frontend free of secrets and receipt material", () => {
    const validated = validateStarterKitInput({
      pack_id: "age_21_retail",
      path: "hosted_partner_flow",
      platform: "wix_velo",
      capabilities: ["webhooks"],
    });
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;
    const kit = generateStarterKit(validated.selection);
    expect(kit.ok).toBe(true);
    if (!kit.ok) return;
    const frontend = kit.files.filter((file) => file.path.startsWith("src/pages/"));
    expect(frontend.length).toBeGreaterThan(0);
    const frontBlob = frontend.map((file) => file.contents).join("\n");
    expect(frontBlob).toContain("backend/abraxas.web");
    expect(frontBlob).not.toContain("YOUR_SANDBOX_API_KEY");
    expect(frontBlob).not.toContain("getSecret");
    expect(frontBlob).not.toContain("verifyReceiptId");
    expect(frontBlob).not.toContain("permitProtocolAction");
    const backend = kit.files.find((file) => file.path === "backend/abraxas.web.js");
    expect(backend?.contents).toContain("permitProtocolAction");
    expect(backend?.contents).toContain("getSecret");
    expect(backend?.contents).toContain("AbraxasPartnerKit");
  });

  it("fails closed on static/browser-only and invalid selections", () => {
    expect(validateStarterKitInput({
      pack_id: "age_21_retail",
      path: "hosted_partner_flow",
      runtime: "browser_only",
    })).toEqual({ ok: false, code: "browser_only_forbidden" });
    expect(validateStarterKitInput({
      pack_id: "age_21_retail",
      path: "hosted_partner_flow",
      runtime: "static_site",
    }).ok).toBe(false);
    expect(validateStarterKitInput({ pack_id: "nope", path: "hosted_partner_flow", runtime: "universal_https" }).ok).toBe(false);
    expect(validateStarterKitInput({
      pack_id: "age_21_retail",
      path: "webhook_events",
      runtime: "javascript_wix_velo",
      capabilities: ["webhooks"],
    }).ok).toBe(false);
    expect(validateStarterKitInput({
      pack_id: "age_21_retail",
      path: "hosted_partner_flow",
      platform: "wix_velo",
      runtime: "typescript_nextjs",
    }).ok).toBe(false);
  });

  it("never moves funds or signs transactions", () => {
    const validated = validateStarterKitInput({
      pack_id: "age_21_retail",
      path: "payment_authorization",
      platform: "solana_backend",
      capabilities: ["wallet_standard_binding"],
    });
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;
    const kit = generateStarterKit(validated.selection);
    expect(kit.ok).toBe(true);
    if (!kit.ok) return;
    expect(kit.files.some((file) => file.contents.includes("authorize_checkout"))).toBe(true);
    expect(kit.files.some((file) => file.contents.includes("solana"))).toBe(true);
    const code = kit.files.map((file) => file.contents).join("\n");
    expect(code).not.toMatch(/createTransfer|confirm_testnet_transfer/);
    expect(kit.does_not_do).toEqual([...STARTER_KIT_DOES_NOT_DO]);
  });
});
