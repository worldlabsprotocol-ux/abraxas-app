// FILE: scripts/demo/lib/demoProvisionerCli.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";
import { DemoDatabaseUrlError } from "./demoDatabaseUrl";
import { PROVISIONER_EXIT } from "./demoProvisionerGuard";

const bootstrapGate = vi.hoisted(() => ({
  configured: true,
}));

vi.mock("./expectedDemoSigningKeyThumbprint", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./expectedDemoSigningKeyThumbprint")>();
  return {
    ...actual,
    isDemoSigningKeyBootstrapConfigured: () =>
      bootstrapGate.configured ? actual.isDemoSigningKeyBootstrapConfigured() : false,
    assertDemoSigningKeyBootstrapConfigured: () => {
      if (!bootstrapGate.configured) {
        throw new actual.DemoSigningKeyBootstrapError();
      }
      return actual.assertDemoSigningKeyBootstrapConfigured();
    },
  };
});

vi.mock("./demoProvisionerSecrets", () => ({
  promptDatabaseUrlIfNeeded: vi.fn(),
  promptSigningKeyIfNeeded: vi.fn(),
  unsetProvisionerSecrets: vi.fn(),
}));

vi.mock("./demoProvisionerApply", () => ({
  runProvisionerApply: vi.fn(),
  formatProvisionerApplyReport: vi.fn(() => "apply-report"),
  formatCommittedStateWriteFailure: vi.fn(() => "committed-state-failure"),
}));

vi.mock("./demoProvisionerVerify", () => ({
  runProvisionerVerify: vi.fn(),
  formatProvisionerVerifyReport: vi.fn(() => "verify-report"),
  verifyExitCode: vi.fn(() => 0),
}));

import { EXPECTED_DEMO_SIGNING_KEY_THUMBPRINT } from "./expectedDemoSigningKeyThumbprint";
import { promptDatabaseUrlIfNeeded, promptSigningKeyIfNeeded } from "./demoProvisionerSecrets";
import { runProvisionerApply } from "./demoProvisionerApply";
import { runProvisionerVerify } from "./demoProvisionerVerify";
import { runProvisionerCommand } from "./demoProvisionerCli";

const baseEnv = {
  DEMO_SUPABASE_PROJECT_REF: "ocntwbxarpjeixdnzide",
  PRODUCTION_SUPABASE_PROJECT_REF: "bztwutzprwsdrtqdpymf",
  NEXT_PUBLIC_SUPABASE_URL: "https://ocntwbxarpjeixdnzide.supabase.co",
  NEXT_PUBLIC_APP_URL: "https://demo.abraxasworld.xyz",
  ABRAXAS_ISSUER_URL: "https://demo.abraxasworld.xyz",
};

describe("runProvisionerCommand", () => {
  beforeEach(() => {
    bootstrapGate.configured = true;
    vi.clearAllMocks();
  });

  it("dry-run does not prompt secrets or open database clients", async () => {
    const code = await runProvisionerCommand([], { ...baseEnv });
    expect(code).toBe(PROVISIONER_EXIT.success);
    expect(promptDatabaseUrlIfNeeded).not.toHaveBeenCalled();
    expect(promptSigningKeyIfNeeded).not.toHaveBeenCalled();
    expect(runProvisionerApply).not.toHaveBeenCalled();
    expect(runProvisionerVerify).not.toHaveBeenCalled();
  });

  it("apply fails closed before database prompt when signing bootstrap is missing", async () => {
    bootstrapGate.configured = false;

    const code = await runProvisionerCommand(
      ["--apply", "--confirm", "ocntwbxarpjeixdnzide"],
      { ...baseEnv },
    );

    expect(code).toBe(PROVISIONER_EXIT.config);
    expect(promptDatabaseUrlIfNeeded).not.toHaveBeenCalled();
    expect(promptSigningKeyIfNeeded).not.toHaveBeenCalled();
    expect(runProvisionerApply).not.toHaveBeenCalled();
  });

  it("apply with configured bootstrap reaches database-url guard without mutation", async () => {
    expect(EXPECTED_DEMO_SIGNING_KEY_THUMBPRINT).toMatch(/^[0-9a-f]{64}$/);
    vi.mocked(promptDatabaseUrlIfNeeded).mockRejectedValueOnce(
      new DemoDatabaseUrlError("DEMO_SUPABASE_DATABASE_URL is not a valid URL"),
    );

    const code = await runProvisionerCommand(
      ["--apply", "--confirm", "ocntwbxarpjeixdnzide"],
      { ...baseEnv },
    );

    expect(code).toBe(PROVISIONER_EXIT.config);
    expect(promptDatabaseUrlIfNeeded).toHaveBeenCalledTimes(1);
    expect(promptSigningKeyIfNeeded).not.toHaveBeenCalled();
    expect(runProvisionerApply).not.toHaveBeenCalled();
    expect(runProvisionerVerify).not.toHaveBeenCalled();
  });
});
