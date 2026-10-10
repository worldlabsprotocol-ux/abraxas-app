// FILE: examples/good-trouble-wix/wixPublicModuleLayout.test.js
// Ensures Wix Public modules exist where Velo page code imports them.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd(), "examples/good-trouble-wix");
const PUBLIC_DIR = join(ROOT, "public");
const PAGES_DIR = join(ROOT, "pages");

const REQUIRED_PUBLIC_MODULES = [
  "abraxasClientConstants.js",
  "ageGateAccessState.js",
  "ageVerificationPopupLogic.js",
  "browseCallbackCompletion.js",
  "browseCallbackLogic.js",
  "purchaseCallbackLogic.js",
  "purchaseReturnDestination.js",
  "purchaseVerificationLogic.js",
];

const PAGE_CODE_FILES = readdirSync(PAGES_DIR).filter(
  (name) => name.endsWith(".js") && !name.endsWith(".test.js") && !name.includes("integration"),
);

const PUBLIC_IMPORT = /from\s+["']public\/([^"']+)["']/g;

describe("Wix public module layout", () => {
  it("hosts every module imported as public/* by Velo page code", () => {
    /** @type {Set<string>} */
    const imported = new Set();
    for (const file of PAGE_CODE_FILES) {
      const source = readFileSync(join(PAGES_DIR, file), "utf8");
      for (const match of source.matchAll(PUBLIC_IMPORT)) {
        imported.add(match[1].replace(/\.js$/, "") + ".js");
      }
    }

    for (const mod of imported) {
      expect(
        existsSync(join(PUBLIC_DIR, mod)),
        `missing public/${mod} (imported from page code)`,
      ).toBe(true);
    }
  });

  it("lists required public modules on disk", () => {
    for (const mod of REQUIRED_PUBLIC_MODULES) {
      expect(existsSync(join(PUBLIC_DIR, mod)), mod).toBe(true);
    }
  });

  it("routes post-verification fallback to The Goods shop slug", () => {
    const constants = readFileSync(join(PUBLIC_DIR, "abraxasClientConstants.js"), "utf8");
    expect(constants).toContain('GOOD_TROUBLE_THE_GOODS_SHOP_PATH = "/goods"');
    expect(constants).toContain(
      "PURCHASE_POST_VERIFICATION_FALLBACK = GOOD_TROUBLE_THE_GOODS_SHOP_PATH",
    );
  });
});
