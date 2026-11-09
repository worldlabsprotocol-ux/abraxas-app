import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../sovereignStagingPg", () => ({
  querySovereignStagingPg: vi.fn(),
}));

import { querySovereignStagingPg } from "../sovereignStagingPg";
import { nextSignedStatusVersion } from "./statusVersionCheckpoint";

const query = vi.mocked(querySovereignStagingPg);

describe("status checkpoint fail closed", () => {
  beforeEach(() => {
    query.mockReset();
  });

  it("returns the authoritative checkpoint version", async () => {
    query.mockResolvedValue({ rows: [{ status_version: 4 }] } as Awaited<ReturnType<typeof querySovereignStagingPg>>);
    const version = await nextSignedStatusVersion({ receiptId: "dr_checkpoint", env: {} });
    expect(version).toBe(4);
    expect(String(query.mock.calls[0]?.[0])).toContain(
      "sovereign_receipt_status_checkpoints.status_version + 1",
    );
  });

  it("does not publish a hash when checkpoint persistence fails", async () => {
    query.mockResolvedValue({ error: "checkpoint_write_failed" } as Awaited<ReturnType<typeof querySovereignStagingPg>>);
    const version = await nextSignedStatusVersion({
      receiptId: "dr_checkpoint",
      env: {},
    });
    expect(version).toEqual({ error: "checkpoint_write_failed" });
    expect(typeof version).not.toBe("number");
  });
});
