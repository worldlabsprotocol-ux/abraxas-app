import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import { HOMEPAGE_HOW_HEADING } from "./homepageHowCopy";
import {
  HOMEPAGE_CLOSE_HEADING,
  HOMEPAGE_WORKSPACE_HEADING,
} from "./homepagePlainCopy";

const ROOT = resolve(__dirname, "../..");

function read(rel: string): string {
  const path = resolve(ROOT, rel);
  expect(existsSync(path)).toBe(true);
  return readFileSync(path, "utf8");
}

describe("homepage plain language", () => {
  it("uses approved public headings", () => {
    expect(HOMEPAGE_WORKSPACE_HEADING).toBe("Create your test workspace");
    expect(HOMEPAGE_HOW_HEADING).toBe("How it works");
    expect(HOMEPAGE_CLOSE_HEADING).toBe("Ready to build?");
  });

  it("does not expose internal native-auth rollout strings on public homepage copy", () => {
    const plain = read("lib/home/homepagePlainCopy.ts");
    const cinematic = read("lib/home/cinematicHomeCopy.ts");
    const corpus = `${plain}\n${cinematic}`;
    expect(corpus).not.toMatch(/ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED/);
    expect(corpus).not.toMatch(/Passkey workspaces are not enabled/);
    expect(corpus).not.toMatch(/not production checkout/i);
  });

  it("does not duplicate InstitutionalHomeClose on homepage build section", () => {
    const build = read("components/home/HomeBuildEntrySection.tsx");
    expect(build).not.toContain("InstitutionalHomeClose");
    expect(build).toContain("HOMEPAGE_CLOSE_HEADING");
  });
});
