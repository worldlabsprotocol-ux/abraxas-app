import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Build 905 homepage builder focus and session continuity", () => {
  it("scrolls the inline workspace instead of legacy #sandbox on homepage handoff", () => {
    const inline = readFileSync(resolve("lib/developers/homepageInlineIntegration.ts"), "utf8");
    expect(inline).toContain("focusHomepageBuilderWorkspace");
    expect(inline).not.toContain('getElementById("sandbox")');
  });

  it("beginner flow uses wallet continuation copy without Launchpad session jargon", () => {
    const beginner = readFileSync(resolve("components/developers/IntegrationStudioBeginnerFlow.tsx"), "utf8");
    expect(beginner).toContain("Continue with wallet");
    expect(beginner).toContain("Connect your wallet to continue");
    expect(beginner).not.toContain("Launchpad session");
    expect(beginner).toContain("data-homepage-active-task");
  });

  it("embedded studio restores wallet session and focuses homepage workspace", () => {
    const client = readFileSync(resolve("app/developers/integration-studio/IntegrationStudioClient.tsx"), "utf8");
    expect(client).toContain("fetchEphemeralWalletClientSession");
    expect(client).toContain("establishLaunchpadSessionWithAccount");
    expect(client).toContain("focusHomepageBuilderWorkspace");
    expect(client).toContain("abraxas:open-wallet-sign-in");
  });

  it("shows embedded studio during homepage integration handoff before verification completion", () => {
    const ephemeral = readFileSync(resolve("components/account/EphemeralSandboxWorkspaceClient.tsx"), "utf8");
    expect(ephemeral).toContain("integrationHandoffLanding");
    expect(ephemeral).toMatch(/showHomepageIntegrationStudio \|\| integrationHandoffLanding/);
  });
});
