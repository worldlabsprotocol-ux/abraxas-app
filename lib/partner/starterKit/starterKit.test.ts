// FILE: lib/partner/starterKit/starterKit.test.ts

import { describe, expect, it } from "vitest";
import { INTEGRATION_STUDIO_PATHS } from "@/lib/partner/integrationStudio/contract";
import { generateStarterKit } from "./generate";
import { validateStarterKitInput } from "./validate";
import { STARTER_KIT_DOES_NOT_DO, STARTER_KIT_PLACEHOLDERS, STARTER_KIT_RUNTIMES } from "./contract";
import { studioPayloadLeaks } from "@/lib/partner/integrationStudio/safety";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const FORBIDDEN = /createTransfer|createCharge|confirm_testnet_transfer|signTransaction|placeOrder|sendAndConfirm|mintTo|abx_live_|wallet_address|legal_name|date_of_birth/;

function readU16(bytes: Uint8Array, offset: number): number {
  return bytes[offset]! | (bytes[offset + 1]! << 8);
}

function readU32(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset]! |
      (bytes[offset + 1]! << 8) |
      (bytes[offset + 2]! << 16) |
      (bytes[offset + 3]! << 24)) >>>
    0
  );
}

function decodeStoreZip(bytes: Uint8Array): Array<{ path: string; contents: string }> {
  const files: Array<{ path: string; contents: string }> = [];
  let offset = 0;
  while (offset + 30 <= bytes.length) {
    const signature = readU32(bytes, offset);
    if (signature === 0x02014b50 || signature === 0x06054b50) break;
    expect(signature).toBe(0x04034b50);
    const method = readU16(bytes, offset + 8);
    expect(method).toBe(0);
    const size = readU32(bytes, offset + 22);
    const nameLen = readU16(bytes, offset + 26);
    const extraLen = readU16(bytes, offset + 28);
    const nameStart = offset + 30;
    const nameEnd = nameStart + nameLen;
    const dataStart = nameEnd + extraLen;
    const dataEnd = dataStart + size;
    const nameBytes = bytes.subarray(nameStart, nameEnd);
    const dataBytes = bytes.subarray(dataStart, dataEnd);
    files.push({
      path: new TextDecoder().decode(nameBytes),
      contents: new TextDecoder().decode(dataBytes),
    });
    offset = dataEnd;
  }
  return files;
}

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
    expect(backend?.contents).toContain("/api/v1/partner-handoff");
  });

  it("ships handoff examples for Universal, Next, Express, Wix, Serverless, and mobile", () => {
    const cases = [
      { runtime: "universal_https" as const, path: "http/handoff.http" },
      { runtime: "typescript_nextjs" as const, path: "src/lib/hosted.ts" },
      { runtime: "typescript_express" as const, path: "src/lib/hosted.ts" },
      { runtime: "javascript_wix_velo" as const, path: "backend/abraxas.web.js" },
      { runtime: "typescript_serverless" as const, path: "handoff.js" },
    ];
    for (const item of cases) {
      const validated = validateStarterKitInput({
        pack_id: "age_21_retail",
        path: "hosted_partner_flow",
        runtime: item.runtime,
      });
      expect(validated.ok, item.runtime).toBe(true);
      if (!validated.ok) return;
      const kit = generateStarterKit(validated.selection);
      expect(kit.ok).toBe(true);
      if (!kit.ok) return;
      expect(kit.files.some((file) => file.path === item.path)).toBe(true);
      expect(kit.files.some((file) => file.contents.includes("/api/v1/partner-handoff"))).toBe(true);
      expect(kit.files.some((file) => file.contents.includes("verifyReceiptId"))).toBe(true);
    }
    const universal = validateStarterKitInput({
      pack_id: "age_21_retail",
      path: "hosted_partner_flow",
      runtime: "universal_https",
    });
    expect(universal.ok).toBe(true);
    if (!universal.ok) return;
    const kit = generateStarterKit(universal.selection);
    expect(kit.ok).toBe(true);
    if (!kit.ok) return;
    expect(kit.files.some((file) => file.path === "http/mobile-deeplink.md")).toBe(true);
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

  it("creates a valid STORE ZIP for every supported runtime without Uint8Array for-of", () => {
    const zipSource = readFileSync(join(process.cwd(), "lib/partner/starterKit/zipStore.ts"), "utf8");
    expect(zipSource).not.toMatch(/for\s*\(\s*const\s+\w+\s+of\s+bytes\s*\)/);
    expect(zipSource).toContain("for (let index = 0; index < bytes.length; index += 1)");

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
      expect(kit.archive_base64.startsWith("UEs")).toBe(true);
      const archive = Uint8Array.from(Buffer.from(kit.archive_base64, "base64"));
      expect(archive[0]).toBe(0x50);
      expect(archive[1]).toBe(0x4b);
      const unzipped = decodeStoreZip(archive);
      expect(unzipped.map((file) => file.path).sort()).toEqual(kit.files.map((file) => file.path).sort());
      for (const file of kit.files) {
        const extracted = unzipped.find((entry) => entry.path === file.path);
        expect(extracted?.contents, `${runtime} ${file.path}`).toBe(file.contents);
        expect(file.path.includes("..")).toBe(false);
        expect(file.path.startsWith("/")).toBe(false);
      }
      const blob = kit.files.map((file) => file.contents).join("\n");
      expect(blob).toContain(STARTER_KIT_PLACEHOLDERS.api_key);
      expect(blob).not.toMatch(/abx_live_|eyJ[A-Za-z0-9_-]{20,}/);
      expect(studioPayloadLeaks({ ...kit, archive_base64: "" })).toEqual([]);
    }
  });
});
