// FILE: lib/sui/zklogin/signInChooser.structure.test.ts
// Static guards — compact header uses one chooser entry point, not stacked auth buttons.

import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../../..");

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), "utf8");
}

describe("zkLogin sign-in chooser structure", () => {
  it("mounts a single shared chooser provider at app root", () => {
    const providers = read("components/providers/AppProviders.tsx");
    expect(providers).toContain("ZkLoginSignInChooserProvider");
    expect(providers).toContain("<SuiAuthProvider>");
  });

  it("uses one compact Sign in header button that opens the chooser", () => {
    const nav = read("components/sui/NavProfileMenu.tsx");
    expect(nav).toContain("useZkLoginSignInChooser");
    expect(nav).toContain("NAV_SIGN_IN_COPY.open");
    expect(nav).toContain("openChooser");
    expect(nav).not.toContain("signInExistingAccount");
    expect(nav).not.toContain("NAV_SIGN_IN_COPY.canonical");
  });

  it("renders chooser actions only inside the shared dialog", () => {
    const dialog = read("components/sui/ZkLoginSignInChooserDialog.tsx");
    expect(dialog).toContain("useGoogleSignIn");
    expect(dialog).toContain("ZKLOGIN_SIGN_IN_COPY.canonicalButton");
    expect(dialog).toContain("ZKLOGIN_SIGN_IN_COPY.legacyButton");
    expect(dialog).toContain("shouldShowLegacySignInOption");
    expect(dialog).toContain('role="dialog"');
    expect(dialog).toContain("aria-modal");
  });

  it("routes Create Passport through the shared chooser when sign-in is configured", () => {
    const hero = read("components/home/HomeSharpHero.tsx");
    expect(hero).toContain("useZkLoginSignInChooserOptional");
    expect(hero).toContain("openChooser");
    expect(hero).toContain("canOpenSignInChooser");
  });
});
