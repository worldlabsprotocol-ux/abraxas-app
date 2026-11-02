// FILE: lib/persistence/chainNeutralSchemaReady.test.ts

import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  chainNeutralIdentitySchemaReady,
  resetChainNeutralSchemaCacheForTests,
} from "./chainNeutralSchemaReady";

const fromMock = vi.hoisted(() => vi.fn());
const directMode = vi.hoisted(() => ({ enabled: false }));
const directProbe = vi.hoisted(() => vi.fn());

vi.mock("@/lib/persistence/env", () => ({
  persistenceUsesDirectPostgres: () => directMode.enabled,
}));

vi.mock("./chainNeutralSchemaDirect", () => ({
  chainNeutralIdentitySchemaReadyDirect: directProbe,
}));

vi.mock("@/lib/persistence/admin", () => ({
  requirePersistenceAdmin: () => ({ from: fromMock }),
}));

function mockTableProbe(results: Array<{ error: { message: string } | null }>) {
  let call = 0;
  fromMock.mockImplementation(() => ({
    select: () => ({
      limit: () => {
        const err = results[call]?.error ?? null;
        call += 1;
        return Promise.resolve({ error: err });
      },
    }),
  }));
}

describe("chainNeutralIdentitySchemaReady", () => {
  beforeEach(() => {
    resetChainNeutralSchemaCacheForTests();
    fromMock.mockReset();
    directMode.enabled = false;
    directProbe.mockReset();
  });

  it("returns false when holder subject table is missing", async () => {
    mockTableProbe([{ error: { message: "relation does not exist" } }]);
    await expect(chainNeutralIdentitySchemaReady(true)).resolves.toBe(false);
  });

  it("returns false when holder_subject_id column is missing", async () => {
    mockTableProbe([
      { error: null },
      { error: { message: "column holder_subject_id does not exist" } },
    ]);
    await expect(chainNeutralIdentitySchemaReady(true)).resolves.toBe(false);
  });

  it("returns true when migration 136 objects are probeable", async () => {
    mockTableProbe([{ error: null }, { error: null }]);
    await expect(chainNeutralIdentitySchemaReady(true)).resolves.toBe(true);
  });

  it("checks the sovereign database without consulting PostgREST in direct mode", async () => {
    directMode.enabled = true;
    directProbe.mockResolvedValue(true);
    await expect(chainNeutralIdentitySchemaReady(true)).resolves.toBe(true);
    expect(directProbe).toHaveBeenCalledOnce();
    expect(fromMock).not.toHaveBeenCalled();
  });
});
