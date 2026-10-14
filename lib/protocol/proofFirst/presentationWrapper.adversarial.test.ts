// FILE: lib/protocol/proofFirst/presentationWrapper.adversarial.test.ts
// Tamper unsigned wrapper fields only — must never GRANT.

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  BUILD_546_FIXTURE_NOW,
  BUILD_546_PARTNER_ID,
  BUILD_546_POLICY_ID,
  build546SampleRecord,
  build546TrustRegistryEnv,
} from "@/lib/institutionalCertification/build546/fixtures";
import {
  composeHolderPolicyScopedPresentation,
  type HolderPolicyScopedPresentation,
} from "./holderPolicyPresentation";
import { verifyHolderPresentationAtRelyingParty } from "./proofFirstRelyingParty";

describe("Build #563 presentation wrapper adversarial (unsigned metadata)", () => {
  let env: Record<string, string>;
  let base: HolderPolicyScopedPresentation;

  beforeEach(() => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("ABRAXAS_") || key.includes("RECEIPT")) delete process.env[key];
    }
    env = build546TrustRegistryEnv();
    Object.assign(process.env, env);
    base = composeHolderPolicyScopedPresentation({
      signedRecord: build546SampleRecord(),
      audiencePartnerId: BUILD_546_PARTNER_ID,
    });
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("ABRAXAS_") || key.includes("RECEIPT")) delete process.env[key];
    }
  });

  async function decide(presentation: HolderPolicyScopedPresentation) {
    return verifyHolderPresentationAtRelyingParty({
      presentation,
      requestId: "req_wrapper_tamper",
      rp: { partnerId: BUILD_546_PARTNER_ID, policyId: BUILD_546_POLICY_ID, env },
      now: BUILD_546_FIXTURE_NOW,
      revocationSource: { available: true, status: "active" },
    });
  }

  it("baseline valid wrapper grants", async () => {
    const decision = await decide(base);
    expect(decision.outcome).toBe("granted");
  });

  const tamperCases: Array<{
    name: string;
    mutate: (p: HolderPolicyScopedPresentation) => void;
  }> = [
    {
      name: "policy_id wrapper drift",
      mutate: (p) => {
        p.policy_id = "tampered-policy-id";
      },
    },
    {
      name: "policy_version wrapper drift",
      mutate: (p) => {
        p.policy_version = 999;
      },
    },
    {
      name: "audience_partner_id wrapper drift",
      mutate: (p) => {
        p.audience_partner_id = "other-partner";
      },
    },
    {
      name: "disclosed_claim_refs smuggled claim",
      mutate: (p) => {
        p.disclosed_claim_refs = [...p.disclosed_claim_refs, "claim-smuggled"];
      },
    },
    {
      name: "disclosed_claim_refs empty",
      mutate: (p) => {
        p.disclosed_claim_refs = [];
      },
    },
    {
      name: "media_type spoof",
      mutate: (p) => {
        (p as { media_type: string }).media_type = "application/json";
      },
    },
    {
      name: "schema_version spoof",
      mutate: (p) => {
        (p as { schema_version: string }).schema_version = "9.9.9";
      },
    },
    {
      name: "excluded_data_classes authority spoof",
      mutate: (p) => {
        (p as { excluded_data_classes: readonly string[] }).excluded_data_classes = [];
      },
    },
  ];

  it.each(tamperCases)("$name — DENY, never GRANTED", async ({ mutate }) => {
    const tampered = structuredClone(base);
    mutate(tampered);
    const decision = await decide(tampered);
    expect(decision.outcome).not.toBe("granted");
    expect(decision.outcome).toBe("denied");
  });
});
