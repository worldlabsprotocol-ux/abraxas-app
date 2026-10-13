import { describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileReceiptConsumptionStore } from "./receiptConsumptionStore";

describe("FileReceiptConsumptionStore", () => {
  it("records once and rejects replay", async () => {
    const dir = await mkdtemp(join(tmpdir(), "abx-rp-consume-"));
    const store = new FileReceiptConsumptionStore(dir);
    const first = await store.tryRecordConsumption({
      receiptId: "dr_test_1",
      requestId: "req-a",
      partnerId: "partner-a",
      at: new Date().toISOString(),
    });
    expect(first.status).toBe("recorded");
    const second = await store.tryRecordConsumption({
      receiptId: "dr_test_1",
      requestId: "req-b",
      partnerId: "partner-a",
      at: new Date().toISOString(),
    });
    expect(second.status).toBe("replay");
    await rm(dir, { recursive: true, force: true });
  });

  it("survives new store instance (process restart simulation)", async () => {
    const dir = await mkdtemp(join(tmpdir(), "abx-rp-restart-"));
    const a = new FileReceiptConsumptionStore(dir, "instance-a");
    await a.tryRecordConsumption({
      receiptId: "dr_restart",
      requestId: "req-1",
      partnerId: "p",
      at: new Date().toISOString(),
    });
    const b = new FileReceiptConsumptionStore(dir, "instance-b");
    expect(await b.hasConsumed("dr_restart")).toBe(true);
    const replay = await b.tryRecordConsumption({
      receiptId: "dr_restart",
      requestId: "req-2",
      partnerId: "p",
      at: new Date().toISOString(),
    });
    expect(replay.status).toBe("replay");
    await rm(dir, { recursive: true, force: true });
  });
});
