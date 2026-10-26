// FILE: lib/decisionReceipts/demoSchemaReconciliation.test.ts

import { describe, expect, it } from "vitest";
import demoProbe from "../../scripts/demo/fixtures/demo-schema-probe-851.json";
import {
  buildDemoCorrectivePlan,
  demoCorrectiveExecutionOrder,
  inferDemoDriftRootCause,
  type DemoSchemaProbe,
} from "@/lib/decisionReceipts/demoSchemaReconciliation";

const DEMO_PROBE = demoProbe as DemoSchemaProbe;

describe("Demo schema reconciliation (#851)", () => {
  it("matches live Demo drift: 093 without 059", () => {
    expect(inferDemoDriftRootCause(DEMO_PROBE)).toContain("093_applied_without_059");
    expect(DEMO_PROBE.tables.reusable_eligibility_facts).toBe(true);
    expect(DEMO_PROBE.functions.revoke_decision_receipt_atomic).toBe(false);
    expect(DEMO_PROBE.tables.decision_receipt_revocation_events).toBe(false);
  });

  it("plans 059 before reuse re-apply and 113 before v1.1 RPC", () => {
    const order = demoCorrectiveExecutionOrder(DEMO_PROBE);
    expect(order.indexOf("059_decision_receipt_revocation_events.sql")).toBeLessThan(
      order.indexOf("113_decision_receipt_evidence_dependencies.sql"),
    );
    expect(order).toContain("059_decision_receipt_revocation_events.sql");
    expect(order).toContain("113_decision_receipt_evidence_dependencies.sql");
    expect(order).not.toContain("093_reusable_eligibility_facts.sql");
  });

  it("does not classify existing receipts as destructive", () => {
    const plan = buildDemoCorrectivePlan(DEMO_PROBE);
    expect(plan.every((s) => s.class !== "potentially_destructive")).toBe(true);
    const m151 = plan.find((s) => s.migration_file.includes("151"));
    expect(m151?.class).toBe("absent_safe_create");
  });

  it("blocks 113 when reuse facts absent (hypothetical)", () => {
    const stripped: DemoSchemaProbe = {
      ...DEMO_PROBE,
      tables: { ...DEMO_PROBE.tables, reusable_eligibility_facts: false, reusable_eligibility_derivations: false },
    };
    const step113 = buildDemoCorrectivePlan(stripped).find((s) => s.migration_file.includes("113"));
    expect(step113?.class).toBe("blocked_missing_prerequisite");
  });
});
