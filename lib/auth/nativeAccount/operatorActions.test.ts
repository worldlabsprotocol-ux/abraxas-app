import { describe, expect, it } from "vitest";
import { buildNativeAuthOperatorActions } from "./operatorActions";

describe("buildNativeAuthOperatorActions", () => {
  it("maps sovereign and migration blockers to operator steps", () => {
    const actions = buildNativeAuthOperatorActions([
      "sovereign_mode_required",
      "migration_144_missing",
    ]);
    expect(actions.some((a) => a.includes("postgres_direct"))).toBe(true);
    expect(actions.some((a) => a.includes("apply-native-account-migrations"))).toBe(true);
  });
});
