// FILE: lib/design/footerLinks.test.ts

import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import {
  FOOTER_COMPANY_LINKS,
  FOOTER_LEGAL_LINKS,
  FOOTER_PRIMARY_LINKS,
} from "./footerLinks";

const ROOT = resolve(__dirname, "../..");

describe("footer links", () => {
  it("exposes minimal institutional footer groups", () => {
    expect(FOOTER_PRIMARY_LINKS.map((l) => l.label)).toEqual(["Pricing", "Documentation"]);
    expect(FOOTER_COMPANY_LINKS.some((l) => l.label === "LinkedIn")).toBe(true);
    expect(FOOTER_LEGAL_LINKS.map((l) => l.label)).toEqual(["Privacy", "Terms"]);
  });

  it("renders minimal footer without product directory columns", () => {
    const footer = readFileSync(resolve(ROOT, "components/redesign/RedesignFooter.tsx"), "utf8");
    expect(footer).toContain("FOOTER_PRIMARY_LINKS");
    expect(footer).toContain("Trust is continuous");
    expect(footer).not.toMatch(/Tokenize/i);
    expect(footer).not.toContain("FooterColumn");
  });
});
