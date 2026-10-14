// FILE: lib/databaseRecovery/auditLog.ts

import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export type BackupAuditEvent =
  | "backup_started"
  | "backup_completed"
  | "backup_failed"
  | "restore_started"
  | "restore_completed"
  | "restore_failed"
  | "verify_passed"
  | "verify_failed"
  | "idv_rehearsal_completed";

export function appendBackupAuditLog(
  outputDir: string,
  event: BackupAuditEvent,
  detail: Record<string, string | number | boolean | null>,
): void {
  const path = `${outputDir}/audit.jsonl`;
  mkdirSync(dirname(path), { recursive: true });
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    event,
    ...detail,
  });
  appendFileSync(path, `${line}\n`, "utf8");
}
