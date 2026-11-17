import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../sovereignStagingPg.runtime", () => ({
  querySovereignStagingPg: vi.fn(),
}));

vi.mock("@/lib/persistence/admin", () => ({
  getPersistenceAdmin: vi.fn(),
}));

import { querySovereignStagingPg } from "../sovereignStagingPg.runtime";
import { getPersistenceAdmin } from "@/lib/persistence/admin";
import { nextSignedStatusVersion } from "./statusVersionCheckpoint";

const query = vi.mocked(querySovereignStagingPg);
const getAdmin = vi.mocked(getPersistenceAdmin);

describe("status checkpoint via operational PostgREST", () => {
  beforeEach(() => {
    query.mockReset();
    getAdmin.mockReset();
    query.mockResolvedValue({ error: "sovereign_staging_pg_unavailable" });
  });

  it("calls atomic bump_portable_export_status_checkpoint RPC when sovereign PG is absent", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 3, error: null });
    getAdmin.mockReturnValue({ rpc } as unknown as ReturnType<typeof getPersistenceAdmin>);

    const version = await nextSignedStatusVersion({ receiptId: "dr_demo", env: {} });
    expect(version).toBe(3);
    expect(rpc).toHaveBeenCalledWith("bump_portable_export_status_checkpoint", {
      p_receipt_id: "dr_demo",
    });
  });

  it("does not use read-modify-write table access", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 1, error: null });
    const from = vi.fn();
    getAdmin.mockReturnValue({ rpc, from } as unknown as ReturnType<typeof getPersistenceAdmin>);

    await nextSignedStatusVersion({ receiptId: "dr_demo", env: {} });
    expect(from).not.toHaveBeenCalled();
  });
});