import { describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileReceiptConsumptionStore } from "./receiptConsumptionStore";
import {
  BUILD_546_FIXTURE_NOW,
  BUILD_546_PARTNER_ID,
  BUILD_546_POLICY_ID,
  build546PublicPartnerView,
  build546SampleRecord,
  build546TrustRegistryEnv,
} from "@/lib/institutionalCertification/build546/fixtures";
import { ExternalRelyingPartyHarness } from "@/lib/institutionalCertification/build546/externalRelyingParty";

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

  it("audit append failure leaves marker — retry is replay, never second grant", async () => {
    const dir = await mkdtemp(join(tmpdir(), "abx-rp-audit-fail-"));
    let failOnce = true;
    const store = new FileReceiptConsumptionStore(dir, "audit-fail", {
      appendAudit: async (path, line) => {
        if (failOnce) {
          failOnce = false;
          throw new Error("simulated_audit_append_failure");
        }
        const { appendFile } = await import("node:fs/promises");
        await appendFile(path, line, "utf8");
      },
    });
    const first = await store.tryRecordConsumption({
      receiptId: "dr_audit_fail",
      requestId: "req-1",
      partnerId: "p",
      at: new Date().toISOString(),
    });
    expect(first.status).toBe("audit_append_failed");
    expect(await store.hasConsumed("dr_audit_fail")).toBe(true);
    const replay = await store.tryRecordConsumption({
      receiptId: "dr_audit_fail",
      requestId: "req-2",
      partnerId: "p",
      at: new Date().toISOString(),
    });
    expect(replay.status).toBe("replay");
    expect(await store.listAudit()).toHaveLength(0);
    await rm(dir, { recursive: true, force: true });
  });

  it("reconcileAuditFromMarkers backfills audit after marker-without-audit", async () => {
    const dir = await mkdtemp(join(tmpdir(), "abx-rp-reconcile-"));
    let failAppend = true;
    const store = new FileReceiptConsumptionStore(dir, "crash", {
      appendAudit: async (path, line) => {
        if (failAppend) {
          failAppend = false;
          throw new Error("simulated_crash_after_marker");
        }
        const { appendFile } = await import("node:fs/promises");
        await appendFile(path, line, "utf8");
      },
    });
    const attempt = await store.tryRecordConsumption({
      receiptId: "dr_crash_only",
      requestId: "req-crash",
      partnerId: "p",
      at: new Date().toISOString(),
    });
    expect(attempt.status).toBe("audit_append_failed");
    expect(await store.listAudit()).toHaveLength(0);
    const { backfilled, skipped } = await store.reconcileAuditFromMarkers!();
    expect(backfilled).toBe(1);
    expect(skipped).toBe(0);
    const audit = await store.listAudit();
    expect(audit).toHaveLength(1);
    expect(audit[0]?.receipt_id).toBe("dr_crash_only");
    const again = await store.reconcileAuditFromMarkers!();
    expect(again.backfilled).toBe(0);
    expect(again.skipped).toBe(1);
    await rm(dir, { recursive: true, force: true });
  });

  it("RP fail-closed: audit failure denies permit but second authorized attempt is replay", async () => {
    const dir = await mkdtemp(join(tmpdir(), "abx-rp-rp-audit-fail-"));
    Object.assign(process.env, build546TrustRegistryEnv());
    let failOnce = true;
    const store = new FileReceiptConsumptionStore(dir, "rp-audit", {
      appendAudit: async (path, line) => {
        if (failOnce) {
          failOnce = false;
          throw new Error("simulated_audit_append_failure");
        }
        const { appendFile } = await import("node:fs/promises");
        await appendFile(path, line, "utf8");
      },
    });
    const rp = new ExternalRelyingPartyHarness({
      partnerId: BUILD_546_PARTNER_ID,
      policyId: BUILD_546_POLICY_ID,
      env: build546TrustRegistryEnv(),
      consumptionStore: store,
    });
    const record = build546SampleRecord();
    const pub = build546PublicPartnerView(record);
    const first = await rp.decide({
      requestId: "audit-fail-req",
      signedRecord: record,
      publicReceipt: pub,
      now: BUILD_546_FIXTURE_NOW,
      revocationSource: { available: true, status: "active" },
    });
    expect(first.authorization_verified).toBe(true);
    expect(first.durable_consumption_marker).toBe(true);
    expect(first.durable_audit_logged).toBe(false);
    expect(first.outcome).toBe("denied");
    expect(first.audit_append_failed).toBe(true);
    expect(first.partner_visible.result).toBe("deny_audit_incomplete");

    const second = await rp.decide({
      requestId: "audit-fail-replay",
      signedRecord: record,
      publicReceipt: pub,
      now: BUILD_546_FIXTURE_NOW,
      revocationSource: { available: true, status: "active" },
    });
    expect(second.outcome).toBe("denied");
    expect(second.replay_detected).toBe(true);
    expect(second.authorization_verified).toBe(true);
    await rm(dir, { recursive: true, force: true });
  });
});
