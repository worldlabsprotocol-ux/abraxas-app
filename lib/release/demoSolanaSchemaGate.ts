// Build #515 — distinguish migration history from live schema for Demo Solana activation.

import {
  evaluateSolanaIncrementalReadiness,
  SOLANA_INCREMENTAL_MIGRATION_FILES,
  SOLANA_MIGRATION_GRAPH,
  type SolanaReadinessEvaluation,
} from "@/lib/release/solanaIncrementalMigrations";

export type SchemaGateVerdict =
  | "ready_complete"
  | "ready_for_incremental_apply"
  | "blocked_missing_prerequisites"
  | "blocked_partial_solana"
  | "blocked_history_only";

export type DemoSolanaSchemaGateResult = SolanaReadinessEvaluation & {
  verdict: SchemaGateVerdict;
  safeNextActions: string[];
  migrationHistoryNote: string | null;
};

export function evaluateDemoSolanaSchemaGate(probe: {
  tablesPresent: readonly string[];
  columnsPresent: readonly string[];
  policyIdsPresent: readonly string[];
  /** Latest name from supabase_migrations.schema_migrations (informational only). */
  latestMigrationName?: string | null;
}): DemoSolanaSchemaGateResult {
  const base = evaluateSolanaIncrementalReadiness(probe);
  const safeNextActions: string[] = [];

  let verdict: SchemaGateVerdict;

  if (base.solanaSchemaComplete) {
    verdict = "ready_complete";
    safeNextActions.push("Solana-native schema objects verified — run release-gate:build515 with live env for flags/RPC.");
  } else if (base.partialSolanaActivation) {
    verdict = "blocked_partial_solana";
    safeNextActions.push(
      "STOP: partial Solana schema detected — do not apply remaining migrations until operator reconciles drift.",
      `Present: ${base.presentSolanaObjects.join(", ") || "(none)"}`,
      `Missing: ${base.missingSolanaObjects.join(", ")}`,
    );
  } else if (base.missingPrerequisites.length > 0) {
    verdict = "blocked_missing_prerequisites";
    for (const name of base.missingPrerequisites) {
      safeNextActions.push(`Restore prerequisite object ${name} before Solana incremental apply.`);
    }
  } else if (base.readyForIncrementalApply) {
    verdict = "ready_for_incremental_apply";
    safeNextActions.push(
      "Founder authorization required before remote apply.",
      `Ordered apply: ${SOLANA_INCREMENTAL_MIGRATION_FILES.join(" → ")}`,
      "Use: npm run demo:solana-incremental-migrate -- --apply --confirm=ocntwbxarpjeixdnzide (with DEMO_SUPABASE_DATABASE_URL set)",
    );
  } else {
    verdict = "blocked_history_only";
    safeNextActions.push("Re-probe live catalog; migration history alone is not sufficient.");
  }

  const historySaysSolana =
    probe.latestMigrationName?.includes("holder_wallet") ||
    probe.latestMigrationName?.includes("solana");
  if (historySaysSolana && !base.solanaSchemaComplete) {
    safeNextActions.push(
      "Migration history suggests Solana work but catalog objects missing — treat history as non-authoritative.",
    );
  }

  return {
    ...base,
    verdict,
    safeNextActions,
    migrationHistoryNote: probe.latestMigrationName ?? null,
  };
}

export function formatDemoSolanaSchemaGateReport(result: DemoSolanaSchemaGateResult): string {
  const lines = [
    `verdict=${result.verdict}`,
    `partial_solana=${result.partialSolanaActivation}`,
    `solana_schema_complete=${result.solanaSchemaComplete}`,
    `ready_for_incremental_apply=${result.readyForIncrementalApply}`,
    "",
    "Prerequisites:",
    ...result.prerequisiteObjects.map(o => `  ${o.present ? "OK" : "MISSING"} ${o.name}`),
    "",
    "Solana objects:",
    ...result.solanaObjects.map(o => `  ${o.present ? "OK" : "MISSING"} ${o.name}`),
    "",
    "Dependency graph (134–138):",
    ...SOLANA_MIGRATION_GRAPH.map(n => `  ${n.file} requires [${n.requiresTables.join(", ")}]`),
    "",
    "Safe next actions:",
    ...result.safeNextActions.map(a => `  - ${a}`),
  ];
  if (result.migrationHistoryNote) {
    lines.push("", `Latest history name (non-authoritative): ${result.migrationHistoryNote}`);
  }
  lines.push("", result.historyNote);
  return lines.join("\n");
}
