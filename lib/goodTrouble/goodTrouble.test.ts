import { describe, expect, it } from "vitest";
import { PROTOCOL_INTEGRATIONS } from "@/lib/protocolIntegrations";
import { getGoodTroubleBatch } from "@/lib/goodTrouble/batchProvenance";
import { batchToCredentialSubject } from "@/lib/credentials/cannabisBatchCredential";
import {
  GOOD_TROUBLE_PARTNER_ID,
  GOOD_TROUBLE_RETAIL_POLICY_ID,
} from "@/lib/goodTrouble/constants";
import { GOOD_TROUBLE_REGISTRY_IMAGE } from "@/lib/goodTrouble/registryEntry";

describe("goodTrouble pilot", () => {
  it("lists Good Trouble as pilot in integration registry", () => {
    const gt = PROTOCOL_INTEGRATIONS.find(p => p.id === "good-trouble-cannabis");
    expect(gt?.status).toBe("pilot");
    expect(gt?.href).toBe("/good-trouble");
    expect(gt?.website).toContain("goodtroublecanna.com");
  });

  it("resolves sample batch fixtures", () => {
    const batch = getGoodTroubleBatch("ABX-CNB-BATCH-002");
    expect(batch?.cultivar).toBe("Fruity Pebbles OG");
    expect(batch?.partner_id).toBe(GOOD_TROUBLE_PARTNER_ID);
    expect(batch?.lab?.thc_percent).toBe(32.4);
  });

  it("maps batch to VC subject shape", () => {
    const batch = getGoodTroubleBatch("GT-KC-2026-GEL-01");
    expect(batch).toBeDefined();
    const subject = batchToCredentialSubject(batch!);
    expect(subject.cultivar).toBe("Gelato");
    expect(subject.record_id).toMatch(/^ABX-CNB-BATCH-/);
  });

  it("uses sandbox retail policy id", () => {
    expect(GOOD_TROUBLE_RETAIL_POLICY_ID).toBe("good-trouble-retail-v1");
  });

  it("uses partner brand logo on registry", () => {
    expect(GOOD_TROUBLE_REGISTRY_IMAGE).toBe("/assets/good-trouble/brand-logo.png");
  });
});
