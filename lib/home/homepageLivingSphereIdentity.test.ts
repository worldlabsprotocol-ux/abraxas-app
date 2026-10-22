import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");

describe("homepage living sphere identity", () => {
  it("uses approved living sphere in hero centerpiece and primary logo", () => {
    const centerpiece = readFileSync(resolve(ROOT, "components/home/defi/AbraxasHeroCenterpiece.tsx"), "utf8");
    expect(centerpiece).toContain("LIVING_SPHERE_BRAND");
    expect(centerpiece).not.toContain("OFFICIAL_EMBLEM_HERO_WEBP");

    const logo = readFileSync(resolve(ROOT, "components/brand/AbraxasLogo.tsx"), "utf8");
    expect(logo).toContain("LIVING_SPHERE_BRAND");
    expect(logo).toContain("abx-brand-living-sphere-mark");
  });
});
