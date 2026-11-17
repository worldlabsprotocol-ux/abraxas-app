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

  it("bumps portable_export_status_checkpoints when sovereign PG is absent", async () => {
    const select = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: { status_version: 2 }, error: null }),
      }),
    });
    const upsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { status_version: 3 }, error: null }),
      }),
    });
    getAdmin.mockReturnValue({
      from: vi.fn((table: string) => {
        expect(table).toBe("portable_export_status_checkpoints");
        return { select, upsert };
      }),
    } as unknown as ReturnType<typeof getPersistenceAdmin>);

    const version = await nextSignedStatusVersion({ receiptId: "dr_demo", env: {} });
    expect(version).toBe(3);
    expect(upsert).toHaveBeenCalledWith(
      { receipt_id: "dr_demo", status_version: 3 },
      { onConflict: "receipt_id" },
    );
  });
});