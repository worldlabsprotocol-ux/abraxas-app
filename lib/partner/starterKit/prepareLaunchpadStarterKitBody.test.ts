// FILE: lib/partner/starterKit/prepareLaunchpadStarterKitBody.test.ts

import { describe, expect, it } from "vitest";
import { validateStarterKitInput } from "./validate";
import { prepareLaunchpadStarterKitBody } from "./prepareLaunchpadStarterKitBody";

describe("prepareLaunchpadStarterKitBody", () => {
  it("strips binding_id so launchpad POST does not fail unknown_field", () => {
    const raw = {
      binding_id: "bind_test_123",
      path: "hosted_partner_flow",
      platform: "wix_velo",
      capabilities: [],
    };
    const prepared = prepareLaunchpadStarterKitBody(raw, "wallet_control");
    expect(prepared).not.toHaveProperty("binding_id");
    expect(prepared.pack_id).toBe("wallet_control");

    const validated = validateStarterKitInput(prepared);
    expect(validated.ok).toBe(true);
    if (validated.ok) {
      expect(validated.selection.platform).toBe("wix_velo");
    }
  });

  it("rejects unexpected client fields before validation", () => {
    expect(() =>
      prepareLaunchpadStarterKitBody(
        { binding_id: "x", path: "hosted_partner_flow", platform: "nextjs", extra: true },
        "wallet_control",
      ),
    ).toThrow(/unexpected_starter_kit_field/);
  });
});
