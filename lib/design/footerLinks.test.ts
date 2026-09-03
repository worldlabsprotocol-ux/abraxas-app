// FILE: lib/design/footerLinks.test.ts

import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import {
  FOOTER_COMPANY_LINKS,
  FOOTER_DEVELOPER_LINKS,
  FOOTER_PRODUCT_LINKS,
} from "./footerLinks";

const ROOT = resolve(__dirname, "../..");

describe("footer links", () => {
  it("exposes product, developer, and company groups", () => {
    expect(FOOTER_PRODUCT_LINKS.map((l) => l.label)).toEqual([
      "Passport",
      "For businesses",
      "Pilot journey",
    ]);
    expect(FOOTER_DEVELOPER_LINKS.some((l) => l.href === "/docs")).toBe(true);
    expect(FOOTER_DEVELOPER_LINKS.some((l) => l.href === "/docs/partner-flow")).toBe(true);
    expect(FOOTER_DEVELOPER_LINKS.some((l) => l.href.includes("/verify"))).toBe(true);
    expect(FOOTER_COMPANY_LINKS.some((l) => l.label === "Privacy")).toBe(true);
  });

  it("renders structured footer without tokenize link", () => {
    const footer = readFileSync(resolve(ROOT, "components/redesign/RedesignFooter.tsx"), "utf8");
    expect(footer).toContain("FOOTER_PRODUCT_LINKS");
    expect(footer).toContain("FOOTER_DEVELOPER_LINKS");
    expect(footer).not.toMatch(/Tokenize/i);
  });
});
