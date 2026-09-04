// FILE: examples/good-trouble-wix/wixClientBoundary.test.js
// Ensures Wix client page code only imports backend web modules and public modules.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd(), "examples/good-trouble-wix");
const PAGES_DIR = join(ROOT, "pages");

const PAGE_FILES = readdirSync(PAGES_DIR).filter((name) => name.endsWith(".js") && !name.endsWith(".test.js"));

const BACKEND_WEB_IMPORT = /from\s+["']backend\/[^"']+\.web(?:\.js)?["']/g;
const BACKEND_IMPORT = /from\s+["']backend\/[^"']+["']/g;
const PUBLIC_CLIENT_CONSTANTS_IMPORT = /from\s+["']public\/abraxasClientConstants(?:\.js)?["']/;

function listBackendImports(source) {
  return [...source.matchAll(BACKEND_IMPORT)].map((match) => match[0]);
}

describe("Wix client/backend boundary", () => {
  it("has no page files importing backend/constants or other non-web backend modules", () => {
    for (const file of PAGE_FILES) {
      const source = readFileSync(join(PAGES_DIR, file), "utf8");
      const imports = listBackendImports(source);

      for (const importLine of imports) {
        expect(importLine, `${file} must not import non-web backend modules: ${importLine}`).toMatch(
          /backend\/[^"']+\.web/,
        );
      }

      expect(imports, `${file} must not import backend/constants`).not.toEqual(
        expect.arrayContaining([expect.stringMatching(/backend\/constants/)]),
      );
      expect(source, `${file} must not reference backend/constants`).not.toMatch(
        /from\s+["']backend\/constants/,
      );
    }
  });

  it("routes browser-safe session constants through public/abraxasClientConstants", () => {
    const popup = readFileSync(join(PAGES_DIR, "AgeVerificationPopup.js"), "utf8");
    const result = readFileSync(join(PAGES_DIR, "AgeVerificationResult.js"), "utf8");

    expect(popup).toMatch(PUBLIC_CLIENT_CONSTANTS_IMPORT);
    expect(result).toMatch(PUBLIC_CLIENT_CONSTANTS_IMPORT);
    expect(popup).not.toMatch(/backend\/constants/);
    expect(result).not.toMatch(/backend\/constants/);
  });

  it("keeps server-only constants out of public client constants module", () => {
    const publicConstants = readFileSync(join(ROOT, "public/abraxasClientConstants.js"), "utf8");
    expect(publicConstants).not.toMatch(/RECEIPT_VALIDATION_MODE/);
    expect(publicConstants).not.toMatch(/PARTNER_ID/);
    expect(publicConstants).not.toMatch(/ABRAXAS_ORIGIN/);
    expect(publicConstants).not.toMatch(/NONCE_STATE/);
    expect(publicConstants).not.toMatch(/FLOW_TTL_MS/);
  });
});
