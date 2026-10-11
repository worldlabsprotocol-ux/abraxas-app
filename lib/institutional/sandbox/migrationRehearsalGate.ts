// Guarded gate before applying migrations 139/140 to an isolated sandbox database.

import { createHash } from "node:crypto";
import { readFileSync as readFs } from "node:fs";
import { resolve } from "node:path";
import { evaluateSandboxSupabaseTarget, parseInstitutionalSandboxAllowlistRefs } from "@/lib/institutional/sandbox/sandboxProjectAllowlist";
import { isKnownProductionSupabaseRef, supabaseProjectRefFromUrl } from "@/lib/supabase/projectRefs";

export const INSTITUTIONAL_REPLAY_MIGRATION_FILES = [
  "139_institutional_eligibility_consume_nonces.sql",
  "140_institutional_replay_rpc_hardening.sql",
] as const;

export type MigrationRehearsalGateVerdict = "PASS" | "FAIL" | "BLOCKED";

export type MigrationRehearsalGateReport = {
  schema: "institutional_replay_migration_gate_v526";
  overall: MigrationRehearsalGateVerdict;
  mode: "dry_run" | "apply_blocked" | "apply_ready";
  target_project_ref: string | null;
  disposable_rehearsal_verdict: string | null;
  backup_acknowledged: boolean;
  operator_confirm: string | null;
  checksums: Record<string, string>;
  checks: Array<{ id: string; verdict: MigrationRehearsalGateVerdict; detail: string }>;
  rollback_instructions: string[];
};

function sha256Migration(file: string): string {
  const content = readFs(resolve(process.cwd(), "supabase/migrations", file), "utf8");
  return createHash("sha256").update(content).digest("hex");
}

export function evaluateMigrationRehearsalGate(input?: {
  databaseUrl?: string;
  dryRun?: boolean;
  applyConfirm?: string | null;
}): MigrationRehearsalGateReport {
  const checks: MigrationRehearsalGateReport["checks"] = [];
  const dryRun = input?.dryRun ?? process.env.INSTITUTIONAL_MIGRATION_DRY_RUN === "1";
  const dbUrl = input?.databaseUrl?.trim()
    || process.env.INSTITUTIONAL_SANDBOX_DATABASE_URL?.trim()
    || process.env.INSTITUTIONAL_REPLAY_TEST_DATABASE_URL?.trim()
    || "";
  const confirm = input?.applyConfirm ?? process.env.INSTITUTIONAL_MIGRATION_APPLY_CONFIRM?.trim() ?? null;
  const rehearsal = process.env.INSTITUTIONAL_REPLAY_DISPOSABLE_REHEARSAL_VERDICT?.trim() ?? null;
  const backupAck = process.env.INSTITUTIONAL_SANDBOX_BACKUP_ACK?.trim() === "acknowledged";

  const checksums: Record<string, string> = {};
  for (const f of INSTITUTIONAL_REPLAY_MIGRATION_FILES) {
    checksums[f] = sha256Migration(f);
  }

  const isLocalDisposable = /localhost|127\.0\.0\.1/.test(dbUrl);
  let targetRef: string | null = null;
  if (dbUrl.includes("supabase.co")) {
    try {
      const host = new URL(dbUrl.replace(/^postgres:/, "postgresql:")).hostname;
      const m = host.match(/db\.([a-z0-9]+)\.supabase\.co/);
      targetRef = m?.[1] ?? supabaseProjectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    } catch {
      targetRef = null;
    }
  } else if (isLocalDisposable) {
    targetRef = "disposable_local";
  }

  if (!dbUrl) {
    checks.push({ id: "database_url", verdict: "BLOCKED", detail: "INSTITUTIONAL_SANDBOX_DATABASE_URL or disposable URL required" });
  } else {
    checks.push({ id: "database_url", verdict: "PASS", detail: isLocalDisposable ? "disposable_local" : "remote_connection_string_present" });
  }

  if (targetRef && targetRef !== "disposable_local" && isKnownProductionSupabaseRef(targetRef)) {
    checks.push({ id: "not_production", verdict: "FAIL", detail: `STOP: production ref ${targetRef}` });
  } else if (targetRef === "disposable_local") {
    checks.push({ id: "not_production", verdict: "PASS", detail: "local disposable database" });
  } else if (targetRef) {
    const allowed = parseInstitutionalSandboxAllowlistRefs();
    checks.push({
      id: "allowlist",
      verdict: allowed.includes(targetRef) ? "PASS" : "FAIL",
      detail: allowed.includes(targetRef) ? `ref ${targetRef} allowlisted` : `ref ${targetRef} not in allowlist`,
    });
  } else {
    checks.push({ id: "allowlist", verdict: "BLOCKED", detail: "Could not resolve target project ref" });
  }

  const sandboxTarget = evaluateSandboxSupabaseTarget();
  checks.push({
    id: "sandbox_environment_id",
    verdict: sandboxTarget.verdict === "PASS" ? "PASS" : sandboxTarget.verdict,
    detail: sandboxTarget.detail,
  });

  if (rehearsal === "PASS") {
    checks.push({ id: "disposable_rehearsal", verdict: "PASS", detail: "INSTITUTIONAL_REPLAY_DISPOSABLE_REHEARSAL_VERDICT=PASS" });
  } else if (isLocalDisposable) {
    checks.push({ id: "disposable_rehearsal", verdict: "BLOCKED", detail: "Run scripts/institutional-replay-postgres-rehearsal.sh first" });
  } else {
    checks.push({
      id: "disposable_rehearsal",
      verdict: "BLOCKED",
      detail: "Remote apply requires disposable rehearsal PASS or use local disposable DB only",
    });
  }

  checks.push({
    id: "backup_ack",
    verdict: isLocalDisposable || backupAck ? "PASS" : "BLOCKED",
    detail: isLocalDisposable ? "not_required_local" : backupAck ? "acknowledged" : "Set INSTITUTIONAL_SANDBOX_BACKUP_ACK=acknowledged after backup/PITR proof",
  });

  const rollback_instructions = [
    "Restore Supabase project from dashboard backup/PITR to pre-migration timestamp.",
    "Or drop disposable database and re-run scripts/institutional-replay-postgres-rehearsal.sh.",
    "Re-run privilege probe: service_role INSERT on institutional_eligibility_consume_nonces must be false after 140.",
  ];

  let mode: MigrationRehearsalGateReport["mode"] = "apply_blocked";
  if (dryRun) {
    mode = "dry_run";
  } else if (confirm && confirm === targetRef) {
    mode = "apply_ready";
  }

  checks.push({
    id: "operator_confirm",
    verdict: dryRun ? "PASS" : confirm === targetRef ? "PASS" : "BLOCKED",
    detail: dryRun
      ? "dry_run_only"
      : confirm
        ? `confirm=${confirm} target=${targetRef ?? "unknown"}`
        : "Set INSTITUTIONAL_MIGRATION_APPLY_CONFIRM=<project_ref> to apply",
  });

  const hasFail = checks.some(c => c.verdict === "FAIL");
  const applyReady = !hasFail && checks.every(c => c.verdict === "PASS") && mode === "apply_ready";
  const dryRunOk = dryRun && !hasFail && checks.filter(c => c.id !== "operator_confirm").every(c => c.verdict === "PASS" || c.verdict === "BLOCKED");

  let overall: MigrationRehearsalGateVerdict = "BLOCKED";
  if (hasFail) overall = "FAIL";
  else if (applyReady) overall = "PASS";
  else if (dryRunOk) overall = "PASS";

  return {
    schema: "institutional_replay_migration_gate_v526",
    overall,
    mode: dryRun ? "dry_run" : applyReady ? "apply_ready" : "apply_blocked",
    target_project_ref: targetRef,
    disposable_rehearsal_verdict: rehearsal,
    backup_acknowledged: backupAck || isLocalDisposable,
    operator_confirm: confirm,
    checksums,
    checks,
    rollback_instructions,
  };
}
