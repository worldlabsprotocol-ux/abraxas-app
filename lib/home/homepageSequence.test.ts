import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");

function read(rel: string): string {
  const path = resolve(ROOT, rel);
  expect(existsSync(path), `missing ${rel}`).toBe(true);
  return readFileSync(path, "utf8");
}

describe("homepage journey sequence", () => {
  it("places unified product entry immediately after hero", () => {
    const shell = read("components/redesign/RedesignHome.tsx");
    const body = shell.slice(shell.indexOf("function HomeContent"));
    const heroIdx = body.indexOf("{hero}");
    const unifiedIdx = body.indexOf("<HomeUnifiedProductEntry");
    expect(heroIdx).toBeGreaterThan(-1);
    expect(unifiedIdx).toBeGreaterThan(heroIdx);
  });

  it("keeps evidence chapter before build capabilities in unified entry", () => {
    const unified = read("components/home/HomeUnifiedProductEntry.tsx");
    expect(unified.indexOf("HomeHowAbraxasWorksSection")).toBeLessThan(unified.indexOf("HomeVerifiableTrustChapter"));
    expect(unified.indexOf("HomeVerifiableTrustChapter")).toBeLessThan(unified.indexOf("HomeBuildEntrySection"));
  });
});
