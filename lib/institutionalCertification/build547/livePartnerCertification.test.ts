// FILE: lib/institutionalCertification/build547/livePartnerCertification.test.ts

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  BUILD_546_FIXTURE_NOW,
  BUILD_546_PARTNER_ID,
  BUILD_546_POLICY_ID,
  BUILD_546_PRIMARY_KEY,
  build546PublicPartnerView,
  build546SampleRecord,
  build546TrustRegistryEnv,
} from "@/lib/institutionalCertification/build546/fixtures";
import { ExternalRelyingPartyHarness } from "@/lib/institutionalCertification/build546/externalRelyingParty";
import { FileReceiptConsumptionStore } from "./receiptConsumptionStore";
import { verifyReceiptIndependently } from "@/lib/institutionalCertification/build546/independentVerifier";

describe("Build #547 live partner verification certification", () => {
  let env: Record<string, string>;
  let storeDir: string;

  beforeEach(async () => {
    env = build546TrustRegistryEnv();
    Object.assign(process.env, env);
    storeDir = await mkdtemp(join(tmpdir(), "abx-build547-"));
  });

  afterEach(async () => {
    await rm(storeDir, { recursive: true, force: true });
  });

  function durableRp(instance: string) {
    return new ExternalRelyingPartyHarness({
      partnerId: BUILD_546_PARTNER_ID,
      policyId: BUILD_546_POLICY_ID,
      env,
      consumptionStore: new FileReceiptConsumptionStore(storeDir, instance),
    });
  }

  it("concurrent replay — exactly one grant under durable store", async () => {
    const record = build546SampleRecord();
    const pub = build546PublicPartnerView(record);
    const rp = durableRp("concurrent-coordinator");
    const attempts = 24;
    const results = await Promise.all(
      Array.from({ length: attempts }, (_, i) =>
        rp.decide({
          requestId: `concurrent-${i}`,
          signedRecord: record,
          publicReceipt: pub,
          now: BUILD_546_FIXTURE_NOW,
          revocationSource: { available: true, status: "active" },
        }),
      ),
    );
    const granted = results.filter((r) => r.outcome === "granted");
    const replays = results.filter((r) => r.replay_detected);
    expect(granted).toHaveLength(1);
    expect(replays.length).toBe(attempts - 1);
    expect(await rp.getConsumptionStore().hasConsumed(record.id)).toBe(true);
  });

  it("process restart — second instance denies replay", async () => {
    const record = build546SampleRecord();
    const pub = build546PublicPartnerView(record);
    const first = durableRp("proc-1");
    const grant = await first.decide({
      requestId: "restart-req-1",
      signedRecord: record,
      publicReceipt: pub,
      now: BUILD_546_FIXTURE_NOW,
      revocationSource: { available: true, status: "active" },
    });
    expect(grant.outcome).toBe("granted");

    const second = durableRp("proc-2");
    const replay = await second.decide({
      requestId: "restart-req-2",
      signedRecord: record,
      publicReceipt: pub,
      now: BUILD_546_FIXTURE_NOW,
      revocationSource: { available: true, status: "active" },
    });
    expect(replay.outcome).toBe("denied");
    expect(replay.replay_detected).toBe(true);
  });

  it("revocation outage then recovery — blocked then authorize", async () => {
    const record = build546SampleRecord();
    const pub = build546PublicPartnerView(record);
    const rp = durableRp("revocation-recovery");
    const outage = await rp.decide({
      requestId: "outage-1",
      signedRecord: record,
      publicReceipt: pub,
      now: BUILD_546_FIXTURE_NOW,
      revocationSource: { available: false, reason: "unavailable" },
    });
    expect(outage.outcome).toBe("blocked");
    expect(outage.verifier.cryptographically_authentic).toBe(true);
    expect(outage.verifier.currently_authorizable).toBe(false);

    const recoveryRecord = build546SampleRecord(BUILD_546_PRIMARY_KEY, { id: "dr_recovery_unique" });
    const recovered = await rp.decide({
      requestId: "recovery-1",
      signedRecord: recoveryRecord,
      publicReceipt: build546PublicPartnerView(recoveryRecord),
      now: BUILD_546_FIXTURE_NOW,
      revocationSource: { available: true, status: "active" },
    });
    expect(recovered.outcome).toBe("granted");
    expect(recovered.verifier.currently_authorizable).toBe(true);
  });

  it("separates cryptographic authenticity from current authorization in audit", async () => {
    const record = build546SampleRecord();
    const result = verifyReceiptIndependently({
      signedRecord: record,
      expectations: { partnerId: BUILD_546_PARTNER_ID, policyId: BUILD_546_POLICY_ID },
      now: BUILD_546_FIXTURE_NOW,
      env,
    });
    expect(result.cryptographically_authentic).toBe(true);
    expect(result.currently_authorizable).toBe(false);
    expect(result.verdict).toBe("blocked");
  });
});
