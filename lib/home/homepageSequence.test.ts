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
  it("places sandbox entry immediately after hero", () => {
    const shell = read("components/redesign/RedesignHome.tsx");
    const body = shell.slice(shell.indexOf("function HomeContent"));
    const heroIdx = body.indexOf("{hero}");
    const sandboxIdx = body.indexOf("<HomeNativeSandboxChapter");
    const howIdx = body.indexOf("HomeHowAbraxasWorksSection");
    expect(heroIdx).toBeGreaterThan(-1);
    expect(sandboxIdx).toBeGreaterThan(heroIdx);
    expect(howIdx).toBeGreaterThan(sandboxIdx);
    expect(body.indexOf("<HomeNativeSandboxChapter", sandboxIdx + 1)).toBe(-1);
  });

  it("keeps trust architecture sections between how-it-works and evidence", () => {
    const shell = read("components/redesign/RedesignHome.tsx");
    const body = shell.slice(shell.indexOf("function HomeContent"));
    const how = body.indexOf("HomeHowAbraxasWorksSection");
    const what = body.indexOf("HomeWhatAbraxasDoesSection");
    const why = body.indexOf("HomeWhyDefensibleSection");
    const evidence = body.indexOf("HomeVerifiableTrustChapter");
    const build = body.indexOf("HomeBuildEntrySection");
    expect(how).toBeLessThan(what);
    expect(what).toBeLessThan(why);
    expect(why).toBeLessThan(evidence);
    expect(evidence).toBeLessThan(build);
  });
});
