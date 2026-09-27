import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SIMPLIFIED_HOME_CTA_PRIMARY_HREF } from "@/lib/home/simplifiedHomeCopy";

const ROOT = process.cwd();

describe("public Abraxas product preview boundary", () => {
  const preview = readFileSync(join(ROOT, "app/try/TryAbraxasClient.tsx"), "utf8");
  const gate = readFileSync(join(ROOT, "components/passport/PassportGate.tsx"), "utf8");

  it("sends the homepage to the no-auth preview", () => {
    expect(SIMPLIFIED_HOME_CTA_PRIMARY_HREF).toBe("/try");
  });

  it("uses the public policy catalog without holder or partner auth", () => {
    expect(preview).toContain('fetch("/api/launchpad/policies"');
    expect(preview).not.toContain("useSuiAuth");
    expect(preview).not.toContain("/api/launchpad/auth/session");
    expect(preview).not.toContain("ensureBrowserSession");
  });

  it("keeps a visible escape from Passport sign-in", () => {
    expect(gate).toContain('href="/try"');
    expect(gate).toContain("Explore without signing in");
  });

  it("starts from the user's goal and supports a specific use case", () => {
    expect(preview).toContain("What do you want Abraxas to enable?");
    expect(preview).toContain("Something specific");
    expect(preview).toContain("Describe the result your product needs");
    expect(preview).toContain("recommended");
  });

  it("labels the preview as non-mutating", () => {
    expect(preview).toContain("not saved");
    expect(preview).toContain("no credentials issued");
    expect(preview).toContain("no production access");
  });
});
