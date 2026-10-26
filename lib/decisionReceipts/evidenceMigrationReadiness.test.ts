// FILE: lib/decisionReceipts/evidenceMigrationReadiness.test.ts

import { describe, expect, it } from "vitest";
import {
  DEMO_EVIDENCE_V11_MIGRATION_ORDER,
  EVIDENCE_MIGRATION_GRAPH,
  demoBlocksV11UntilEvidenceLayer,
} from "@/lib/decisionReceipts/evidenceMigrationReadiness";

describe("evidence migration readiness graph", () => {
  it("orders 113 before 153 and 059 before 093", () => {
    const idx = (file: string) => DEMO_EVIDENCE_V11_MIGRATION_ORDER.indexOf(file as (typeof DEMO_EVIDENCE_V11_MIGRATION_ORDER)[number]);
    expect(idx("059_decision_receipt_revocation_events.sql")).toBeLessThan(idx("093_reusable_eligibility_facts.sql"));
    expect(idx("113_decision_receipt_evidence_dependencies.sql")).toBeLessThan(idx("153_decision_receipt_v11_finalize_atomic.sql"));
  });

  it("documents 113 prerequisites from SQL comments", () => {
    const node113 = EVIDENCE_MIGRATION_GRAPH.find((n) => n.migration_file.includes("113_"));
    expect(node113?.prerequisites).toContain("093_reusable_eligibility_facts.sql");
    expect(node113?.creates).toContain("decision_receipt_evidence_dependencies");
  });

  it("flags Demo blockers when evidence tables absent", () => {
    const blockers = demoBlocksV11UntilEvidenceLayer({
      decision_receipt_evidence_dependencies: false,
      decision_receipt_revocation_events: false,
      reusable_eligibility_facts: true,
      reusable_eligibility_derivations: true,
      migration_151_applied: false,
      migration_152_applied: false,
      migration_153_applied: false,
    });
    expect(blockers).toContain("apply_113_evidence_dependencies_before_v11_finalize");
    expect(blockers).toContain("apply_059_revocation_events_before_reuse_rollout");
  });
});
