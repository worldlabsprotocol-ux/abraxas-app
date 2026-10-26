// FILE: lib/decisionReceipts/v1_1_0/demoMigrationPreflight.ts
// Read-only migration 151/152/153 state probes (portable SQL result shapes).

export type ColumnProbeRow = { column_name: string };

export type ReceiptCountRow = {
  total: number;
  v10: number;
  v11: number;
  pending: number;
  active: number;
  revoked: number;
};

export type StatusConstraintRow = { conname: string; def: string };

export type RpcProbeRow = { proname: string; args: string; security_definer: boolean };

export type DemoMigration151152153State = {
  migration_151: "absent" | "applied";
  migration_152: "absent" | "applied";
  migration_153: "absent" | "applied";
  status_allows_pending_finalization: boolean;
};

export function inferMigration151152153State(input: {
  columns: ColumnProbeRow[];
  rpc: RpcProbeRow[];
  statusConstraints: StatusConstraintRow[];
}): DemoMigration151152153State {
  const names = new Set(input.columns.map(c => c.column_name));
  const migration151 = names.has("issuance_finalized_at") ? "applied" : "absent";
  const migration152 =
    names.has("application_binding_ref")
    && names.has("evidence_commitment")
    && names.has("evidence_commitment_manifest")
    && names.has("v11_issuance_phase")
      ? "applied"
      : "absent";
  const migration153 = input.rpc.some(r => r.proname === "abraxas_finalize_v11_receipt_atomic")
    ? "applied"
    : "absent";
  const statusDef = input.statusConstraints.find(c => c.conname === "decision_receipts_status_check")?.def ?? "";
  const status_allows_pending_finalization = statusDef.includes("pending_finalization");

  return {
    migration_151: migration151,
    migration_152: migration152,
    migration_153: migration153,
    status_allows_pending_finalization,
  };
}

export function formatDemoMigrationPreflightReport(input: {
  project_ref: string;
  environment_label: "demo" | "production";
  state: DemoMigration151152153State;
  receipt_counts: ReceiptCountRow;
  notes: string[];
}): string {
  const lines = [
    `# Receipt v1.1.0 migration preflight (${input.environment_label})`,
    "",
    `- **Project ref:** ${input.project_ref}`,
    `- **Migration 151:** ${input.state.migration_151}`,
    `- **Migration 152:** ${input.state.migration_152}`,
    `- **Migration 153:** ${input.state.migration_153}`,
    `- **Status allows pending_finalization:** ${input.state.status_allows_pending_finalization}`,
    "",
    "## Receipt inventory",
    "",
    `- Total: ${input.receipt_counts.total}`,
    `- v1.0.0: ${input.receipt_counts.v10}`,
    `- v1.1.0: ${input.receipt_counts.v11}`,
    `- pending_finalization: ${input.receipt_counts.pending}`,
    `- active: ${input.receipt_counts.active}`,
    `- revoked: ${input.receipt_counts.revoked}`,
    "",
  ];
  if (input.notes.length) {
    lines.push("## Notes", "", ...input.notes.map(n => `- ${n}`), "");
  }
  return lines.join("\n");
}
