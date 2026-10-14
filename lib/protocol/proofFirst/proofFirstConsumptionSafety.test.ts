// FILE: lib/protocol/proofFirst/proofFirstConsumptionSafety.test.ts
// Preflight reject must not consume; valid wrapper consumes once under concurrency.

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  BUILD_546_FIXTURE_NOW,
  BUILD_546_PARTNER_ID,
  BUILD_546_POLICY_ID,
  build546SampleRecord,
  build546TrustRegistryEnv,
} from "@/lib/institutionalCertification/build546/fixtures";
import { ExternalRelyingPartyHarness } from "@/lib/institutionalCertification/build546/externalRelyingParty";
import { composeHolderPolicyScopedPresentation } from "./holderPolicyPresentation";
import { verifyHolderPresentationAtRelyingParty } from "./proofFirstRelyingParty";
import { activePortableRevocationSnapshotForReceipt } from "./proofFirstTestRevocation";

describe("Build #563 proof-first consumption safety", () => {
  let env: Record<string, string>;

  beforeEach(() => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("ABRAXAS_") || key.includes("RECEIPT")) delete process.env[key];
    }
    env = build546TrustRegistryEnv();
    Object.assign(process.env, env);
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("ABRAXAS_") || key.includes("RECEIPT")) delete process.env[key];
    }
  });

  it("tampered wrapper DENY leaves zero consumption; valid wrapper GRANTED after", async () => {
    const signed = build546SampleRecord();
    const valid = composeHolderPolicyScopedPresentation({
      signedRecord: signed,
      audiencePartnerId: BUILD_546_PARTNER_ID,
    });
    const tampered = structuredClone(valid);
    tampered.policy_id = "wrapper-tamper-policy";

    const harness = new ExternalRelyingPartyHarness({
      partnerId: BUILD_546_PARTNER_ID,
      policyId: BUILD_546_POLICY_ID,
      env,
    });
    const scope = {
      partnerId: BUILD_546_PARTNER_ID,
      policyId: BUILD_546_POLICY_ID,
      receiptId: signed.id,
    };

    const denied = await verifyHolderPresentationAtRelyingParty({
      presentation: tampered,
      requestId: "req_tamper_first",
      rp: { partnerId: BUILD_546_PARTNER_ID, policyId: BUILD_546_POLICY_ID, env },
      now: BUILD_546_FIXTURE_NOW,
      portableRevocationSnapshot: activePortableRevocationSnapshotForReceipt(signed.id),
      harness,
    });

    expect(denied.outcome).toBe("denied");
    expect(denied.consumption_skipped_preflight_reject).toBe(true);
    expect(denied.authorization_verified).toBe(false);
    expect(denied.consumption_recorded).toBe(false);
    expect(denied.durable_consumption_marker).toBe(false);
    expect(await harness.getConsumptionStore().hasConsumed(scope)).toBe(false);
    expect(denied.verifier.phases.some((p) => p.id === "signature_authenticity")).toBe(true);

    const granted = await verifyHolderPresentationAtRelyingParty({
      presentation: valid,
      requestId: "req_valid_after_tamper",
      rp: { partnerId: BUILD_546_PARTNER_ID, policyId: BUILD_546_POLICY_ID, env },
      now: BUILD_546_FIXTURE_NOW,
      portableRevocationSnapshot: activePortableRevocationSnapshotForReceipt(signed.id),
      harness,
    });

    expect(granted.outcome).toBe("granted");
    expect(granted.consumption_recorded).toBe(true);
    expect(granted.durable_consumption_marker).toBe(true);
    expect(await harness.getConsumptionStore().hasConsumed(scope)).toBe(true);
  });

  it("concurrent valid presentations — exactly one grant via proof-first path", async () => {
    const signed = build546SampleRecord();
    const presentation = composeHolderPolicyScopedPresentation({
      signedRecord: signed,
      audiencePartnerId: BUILD_546_PARTNER_ID,
    });
    const harness = new ExternalRelyingPartyHarness({
      partnerId: BUILD_546_PARTNER_ID,
      policyId: BUILD_546_POLICY_ID,
      env,
    });
    const attempts = 16;
    const results = await Promise.all(
      Array.from({ length: attempts }, (_, i) =>
        verifyHolderPresentationAtRelyingParty({
          presentation,
          requestId: `concurrent_pf_${i}`,
          rp: { partnerId: BUILD_546_PARTNER_ID, policyId: BUILD_546_POLICY_ID, env },
          now: BUILD_546_FIXTURE_NOW,
          portableRevocationSnapshot: activePortableRevocationSnapshotForReceipt(signed.id),
          harness,
        }),
      ),
    );
    const granted = results.filter((r) => r.outcome === "granted");
    const replayDenied = results.filter((r) => r.replay_detected);
    expect(granted).toHaveLength(1);
    expect(replayDenied.length).toBe(attempts - 1);
  });
});
