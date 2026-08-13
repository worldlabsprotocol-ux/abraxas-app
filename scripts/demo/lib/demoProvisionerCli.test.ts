// FILE: scripts/demo/lib/demoProvisionerCli.test.ts

import { describe, expect, it, vi } from "vitest";
import { PROVISIONER_EXIT } from "./demoProvisionerGuard";

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
  it("dry-run does not prompt secrets or open database clients", async () => {
    const code = await runProvisionerCommand([], { ...baseEnv });
    expect(code).toBe(PROVISIONER_EXIT.success);
    expect(promptDatabaseUrlIfNeeded).not.toHaveBeenCalled();
    expect(promptSigningKeyIfNeeded).not.toHaveBeenCalled();
    expect(runProvisionerApply).not.toHaveBeenCalled();
    expect(runProvisionerVerify).not.toHaveBeenCalled();
  });

  it("apply fails closed before database prompt when signing bootstrap is missing", async () => {
    const code = await runProvisionerCommand(
      ["--apply", "--confirm", "ocntwbxarpjeixdnzide"],
      { ...baseEnv },
    );
    expect(code).toBe(PROVISIONER_EXIT.config);
    expect(promptDatabaseUrlIfNeeded).not.toHaveBeenCalled();
    expect(promptSigningKeyIfNeeded).not.toHaveBeenCalled();
    expect(runProvisionerApply).not.toHaveBeenCalled();
  });
});
