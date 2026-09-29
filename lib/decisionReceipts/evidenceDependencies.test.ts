import { describe, expect, it } from "vitest";
import type { EvidenceDependencyInsertRow } from "./evidenceDependencies";

describe("evidence dependency insert contract", () => {
  it("allows null source_credential_id for derived_from links", () => {
    const row: EvidenceDependencyInsertRow = {
      receipt_id: "dr_derived",
      fact_id: "fact_parent",
      source_credential_id: null,
      dependency_type: "derived_from",
    };
    expect(row.source_credential_id).toBeNull();
  });

  it("requires source_credential_id for receipt-backed dependency types", () => {
    const reusable: EvidenceDependencyInsertRow = {
      receipt_id: "dr_derived",
      fact_id: "fact_1",
      source_credential_id: "dr_source",
      dependency_type: "reusable_fact",
    };
    const source: EvidenceDependencyInsertRow = {
      receipt_id: "dr_derived",
      fact_id: "fact_1",
      source_credential_id: "dr_source",
      dependency_type: "source_receipt",
    };
    expect(reusable.source_credential_id).toBe("dr_source");
    expect(source.source_credential_id).toBe("dr_source");
  });
});
