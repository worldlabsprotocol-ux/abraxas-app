import { describe, expect, it } from "vitest";
import { buildPassportProgress } from "./passportProgress";

describe("buildPassportProgress", () => {
  it("prompts sign-in when account inactive", () => {
    const p = buildPassportProgress({
      accountActive: false,
      profileComplete: false,
      walletBound: false,
      walletBindingFresh: false,
      identityCredentialActive: false,
    });
    expect(p.primaryAction).toBe("sign-in");
    expect(p.completedRequired).toBe(0);
  });

  it("prompts add wallet when signed in but not bound", () => {
    const p = buildPassportProgress({
      accountActive: true,
      profileComplete: false,
      walletBound: false,
      walletBindingFresh: false,
      identityCredentialActive: false,
    });
    expect(p.primaryAction).toBe("add-wallet");
    expect(p.statusLabel).toContain("connect a wallet");
  });

  it("marks ready when wallet bound", () => {
    const p = buildPassportProgress({
      accountActive: true,
      profileComplete: true,
      walletBound: true,
      walletBindingFresh: true,
      identityCredentialActive: false,
    });
    expect(p.primaryAction).toBe("verify-identity");
    expect(p.unlockedSummary.length).toBeGreaterThan(0);
  });
});
