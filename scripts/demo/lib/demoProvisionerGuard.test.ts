// FILE: scripts/demo/lib/demoProvisionerGuard.test.ts

import { describe, expect, it } from "vitest";
import {
  assertApplyConfirmation,
  parseProvisionerArgs,
  PROVISIONER_EXIT,
  rejectProductionNodeEnv,
} from "./demoProvisionerGuard";
import { DemoProjectGuardError } from "./demoProjectGuard";

describe("demoProvisionerGuard", () => {
  it("parses dry-run by default", () => {
    expect(parseProvisionerArgs([])).toEqual({ mode: "dry-run" });
  });

  it("parses apply and verify modes", () => {
    expect(parseProvisionerArgs(["--apply", "--confirm", "demo-ref"])).toEqual({
      mode: "apply",
      confirm: "demo-ref",
    });
    expect(parseProvisionerArgs(["--verify", "--recover", "11111111-1111-4111-8111-111111111111"])).toEqual({
      mode: "verify",
      recoverProvisionId: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("requires exact confirm match", () => {
    expect(() => assertApplyConfirmation("wrong", "demo-ref")).toThrow(DemoProjectGuardError);
    expect(() => assertApplyConfirmation("demo-ref", "demo-ref")).not.toThrow();
  });

  it("rejects NODE_ENV=production", () => {
    expect(() => rejectProductionNodeEnv({ NODE_ENV: "production" })).toThrow(/production/);
  });

  it("defines stable exit codes", () => {
    expect(PROVISIONER_EXIT.conflict).toBe(3);
    expect(PROVISIONER_EXIT.committedStateWriteFailed).toBe(4);
  });
});
