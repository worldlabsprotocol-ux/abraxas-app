// FILE: lib/persistence/chainNeutralSchemaReady.test.ts

import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  chainNeutralIdentitySchemaReady,
  resetChainNeutralSchemaCacheForTests,
} from "./chainNeutralSchemaReady";

const directMode = vi.hoisted(() => ({ enabled: false }));
const directProbe = vi.hoisted(() => vi.fn());

vi.mock("@/lib/persistence/env", () => ({
  isPassportDirectPostgresEnabled: () => directMode.enabled,
}));

vi.mock("./chainNeutralSchemaDirect", () => ({
  chainNeutralIdentitySchemaReadyDirect: directProbe,
}));

describe("chainNeutralIdentitySchemaReady", () => {
  beforeEach(() => {
    resetChainNeutralSchemaCacheForTests();
    directMode.enabled = false;
    directProbe.mockReset();
  });

  it("fails closed when the sovereign Passport binding is absent", async () => {
    await expect(chainNeutralIdentitySchemaReady(true)).resolves.toBe(false);
    expect(directProbe).not.toHaveBeenCalled();
  });

  it("returns false when the sovereign schema probe fails", async () => {
    directMode.enabled = true;
    directProbe.mockResolvedValue(false);
    await expect(chainNeutralIdentitySchemaReady(true)).resolves.toBe(false);
  });

  it("checks the sovereign database directly", async () => {
    directMode.enabled = true;
    directProbe.mockResolvedValue(true);
    await expect(chainNeutralIdentitySchemaReady(true)).resolves.toBe(true);
    expect(directProbe).toHaveBeenCalledOnce();
  });
});
