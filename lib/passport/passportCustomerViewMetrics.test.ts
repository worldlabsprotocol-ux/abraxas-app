// FILE: lib/passport/passportCustomerViewMetrics.test.ts
// Guards default Passport brevity vs pre-cleanup main.

import { readFileSync } from "fs";
import { resolve } from "path";
import { execSync } from "child_process";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

describe("passport customer view metrics", () => {
  it("uses PassportCustomerView instead of technical dashboard on default page", () => {
    const page = readFileSync(resolve(ROOT, "app/passport/page.tsx"), "utf8");
    expect(page).toContain("PassportCustomerView");
    expect(page).not.toContain("PassportDashboard");
    expect(page).not.toContain("PassportSetupPanel");
    expect(page).not.toContain("PassportSetupStepRail");
    expect(page).not.toContain("DeveloperDetails");
  });

  it("routes advanced technical content to /passport/advanced", () => {
    const advanced = readFileSync(resolve(ROOT, "app/passport/advanced/page.tsx"), "utf8");
    expect(advanced).toContain("PassportDashboard");
    expect(advanced).not.toMatch(/Developer receipt tester/i);
  });

  it("reduces default passport page word count versus pre-cleanup main", () => {
    const current = readFileSync(resolve(ROOT, "app/passport/page.tsx"), "utf8");
    const before = execSync("git show c02c335c:app/passport/page.tsx", { cwd: ROOT, encoding: "utf8" });
    const currentWords = wordCount(current);
    const beforeWords = wordCount(before);
    expect(currentWords).toBeLessThan(beforeWords * 0.8);
  });
});
