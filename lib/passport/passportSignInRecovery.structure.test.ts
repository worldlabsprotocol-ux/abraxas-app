// FILE: lib/passport/passportSignInRecovery.structure.test.ts
// Static guards for persistent Passport zkLogin recovery UX.

import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), "utf8");
}

describe("Passport sign-in recovery structure", () => {
  it("persists recovery state in auth provider and session storage", () => {
    const provider = read("components/sui/SuiAuthProvider.tsx");
    expect(provider).toContain("signInRecovery");
    expect(provider).toContain("dismissSignInRecovery");
    expect(provider).toContain("saveSignInRecovery");
    expect(provider).toContain("loadSignInRecovery");
    expect(provider).toContain("clearSignInRecovery");
  });

  it("renders a persistent recovery panel on Passport when wallet is missing", () => {
    const dashboard = read("components/passport/PassportDashboard.tsx");
    const panel = read("components/passport/PassportSignInRecoveryPanel.tsx");
    expect(dashboard).toContain("PassportSignInRecoveryPanel");
    expect(dashboard).toContain("signInRecovery");
    expect(panel).toContain("recoveryPrimaryActionLabel");
    expect(panel).toContain("recoveryDismissButton");
  });

  it("routes callback recovery errors with suggested login mode", () => {
    const callback = read("app/auth/zklogin/callback/page.tsx");
    expect(callback).toContain("ZkLoginSignInRecoveryError");
    expect(callback).toContain("buildPassportRecoveryQuery");
  });
});
