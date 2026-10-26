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
  it("orders hero carousel, sandbox entry, then protocol signal", () => {
    const shell = read("components/redesign/RedesignHome.tsx");
    const body = shell.slice(shell.indexOf("function HomeContent"));
    const heroIdx = body.indexOf("{hero}");
    const unifiedIdx = body.indexOf("<HomeUnifiedProductEntry");
    const marqueeIdx = body.indexOf("<HomeProtocolSignalMarquee");
    expect(heroIdx).toBeGreaterThan(-1);
    expect(unifiedIdx).toBeGreaterThan(heroIdx);
    expect(marqueeIdx).toBeGreaterThan(unifiedIdx);
  });

  it("unified entry leads with sandbox workspace only", () => {
    const unified = read("components/home/HomeUnifiedProductEntry.tsx");
    expect(unified).toContain("HomeNativeSandboxChapter");
    expect(unified).not.toContain("HomeHowAbraxasWorksSection");
    expect(unified).not.toContain("abx-home-unified-entry__nav");
  });
});
