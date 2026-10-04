// FILE: lib/gtm/whyPage.test.ts

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { scanGtmCopyForProhibitedClaims } from "./claimSafety";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("/why buyer narrative", () => {
  it("does not expose stale RWA/yield product copy", () => {
    const page = read("app/why/page.tsx");
    const content = read("components/gtm/WhyAbraxasContent.tsx");
    const blob = `${page}\n${content}`;
    expect(blob).not.toMatch(/abraYIELD|tokenized RWA|\$36B|Operate an Asset/i);
    expect(blob).toMatch(/Keep your existing KYC provider/i);
    expect(blob).toMatch(/reuse/i);
  });

  it("passes GTM claim safety on why content", () => {
    const content = read("components/gtm/WhyAbraxasContent.tsx");
    expect(scanGtmCopyForProhibitedClaims(content)).toEqual([]);
  });

  it("links buyers to proof and hands-on reuse evaluation", () => {
    const content = read("components/gtm/WhyAbraxasContent.tsx");
    expect(content).toContain('href={GTM_PRIMARY_CTA_HREF}');
    expect(content).toContain('href={GTM_HANDS_ON_REUSE_HREF}');
  });
});
