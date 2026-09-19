// FILE: lib/partner/starterKit/starterKit.test.ts

import { describe, expect, it } from "vitest";
import { INTEGRATION_STUDIO_PATHS } from "@/lib/partner/integrationStudio/contract";
import { generateStarterKit } from "./generate";
import { validateStarterKitInput } from "./validate";
import { STARTER_KIT_DOES_NOT_DO, STARTER_KIT_RUNTIMES } from "./contract";
import { studioPayloadLeaks } from "@/lib/partner/integrationStudio/safety";

const FORBIDDEN = /createTransfer|createCharge|confirm_testnet_transfer|signTransaction|placeOrder|sendAndConfirm|mintTo|abx_live_|wallet_address|legal_name|date_of_birth/;

describe("Partner Starter Kit Generator", () => {
  it("renders every integration path for every runtime", () => {
    for (const path of INTEGRATION_STUDIO_PATHS) {
      for (const runtime of STARTER_KIT_RUNTIMES) {
        const validated = validateStarterKitInput({
          pack_id: "age_21_retail",
          path,
          runtime,
          capabilities: [],
        });
        expect(validated.ok).toBe(true);
        if (!validated.ok) continue;
        const kit = generateStarterKit(validated.selection);
        expect(kit.ok).toBe(true);
        if (!kit.ok) continue;
        const names = kit.files.map((file) => file.path);
        expect(names).toContain("README.md");
        expect(names).toContain(".env.example");
        expect(names).toContain("DEPLOYMENT.md");
        expect(names).toContain("WHAT_THIS_DOES_NOT_DO.md");
        expect(names).toContain("tests/receipt-fixture.test.ts");
        expect(kit.bundle).toContain("permitProtocolAction");
        expect(kit.bundle).toContain("currently_valid");
        expect(kit.bundle).toContain("YOUR_PARTNER_ID");
        expect(kit.does_not_do).toEqual([...STARTER_KIT_DOES_NOT_DO]);
        const code = kit.files.filter((file) => file.path.endsWith(".ts")).map((file) => file.contents).join("\n");
        expect(code).not.toMatch(FORBIDDEN);
        expect(studioPayloadLeaks(kit)).toEqual([]);
      }
    }
  });

  it("includes webhook verification when selected and keeps receipt live-validity checks", () => {
    const validated = validateStarterKitInput({
      pack_id: "membership_credential",
      path: "hosted_partner_flow",
      runtime: "typescript_nextjs",
      capabilities: ["webhooks"],
    });
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;
    const kit = generateStarterKit(validated.selection);
    expect(kit.ok).toBe(true);
    if (!kit.ok) return;
    expect(kit.files.some((file) => file.path.includes("webhooks"))).toBe(true);
    expect(kit.bundle).toContain("verifyPartnerWebhookEvent");
    expect(kit.bundle).toContain("verifyReceiptId");
    expect(kit.bundle).toContain("grant: false");
  });

  it("fails closed on invalid or mixed selections", () => {
    expect(validateStarterKitInput({ pack_id: "nope", path: "hosted_partner_flow", runtime: "typescript_nextjs" }).ok).toBe(false);
    expect(validateStarterKitInput({ pack_id: "age_21_retail", path: "mint_token", runtime: "typescript_nextjs" }).ok).toBe(false);
    expect(validateStarterKitInput({ pack_id: "age_21_retail", path: "hosted_partner_flow", runtime: "python" }).ok).toBe(false);
    expect(validateStarterKitInput({
      pack_id: "age_21_retail",
      path: "webhook_events",
      runtime: "typescript_express",
      capabilities: ["webhooks"],
    }).ok).toBe(false);
    expect(validateStarterKitInput({
      pack_id: "age_21_retail",
      path: "hosted_partner_flow",
      runtime: "typescript_nextjs",
      capabilities: ["circle"],
    }).ok).toBe(false);
    expect(validateStarterKitInput({
      pack_id: "age_21_retail",
      path: "hosted_partner_flow",
      runtime: "typescript_nextjs",
      extra: "inject",
    }).ok).toBe(false);
  });

  it("never moves funds or signs transactions", () => {
    const validated = validateStarterKitInput({
      pack_id: "age_21_retail",
      path: "payment_authorization",
      runtime: "typescript_express",
      capabilities: ["wallet_standard_binding", "solana_gate"],
    });
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;
    const kit = generateStarterKit(validated.selection);
    expect(kit.ok).toBe(true);
    if (!kit.ok) return;
    expect(kit.bundle).toContain("authorize_checkout");
    expect(kit.bundle).toContain("signWalletStandardChallenge");
    expect(kit.bundle).toContain("creates_transactions: false");
    const code = kit.files.filter((file) => file.path.endsWith(".ts")).map((file) => file.contents).join("\n");
    expect(code).not.toMatch(/signTransaction|createTransfer|confirm_testnet_transfer/);
    expect(kit.filename).toBe("abraxas-starter-payment_authorization-typescript_express.txt");
    expect(kit.filename).not.toContain("..");
  });
});
