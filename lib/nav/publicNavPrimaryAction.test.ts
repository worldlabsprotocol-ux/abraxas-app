// FILE: lib/nav/publicNavPrimaryAction.test.ts

import { describe, expect, it } from "vitest";
import { resolvePublicNavPrimaryAction } from "./publicNavPrimaryAction";

describe("resolvePublicNavPrimaryAction", () => {
  it("uses Start building on the homepage for visitors", () => {
    const action = resolvePublicNavPrimaryAction({
      developerSessionAuthenticated: false,
      pathname: "/",
    });
    expect(action.label).toBe("Start building");
    expect(action.href).toBe("#start-sandbox");
  });

  it("uses Continue building when a developer session exists off-home", () => {
    const action = resolvePublicNavPrimaryAction({
      developerSessionAuthenticated: true,
      pathname: "/developers/ephemeral-sandbox",
    });
    expect(action.label).toBe("Continue building");
    expect(action.href).toBe("/developers/ephemeral-sandbox");
  });

  it("keeps Continue building on the homepage without route hop", () => {
    const action = resolvePublicNavPrimaryAction({
      developerSessionAuthenticated: true,
      pathname: "/",
    });
    expect(action.label).toBe("Continue building");
    expect(action.href).toBe("#start-sandbox");
  });
});
