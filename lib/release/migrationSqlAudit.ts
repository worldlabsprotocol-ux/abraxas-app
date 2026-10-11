// Static SQL audit for migration files (no execution).

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export type SqlAuditFinding = {
  severity: "stop" | "warn" | "info";
  pattern: string;
  line: number;
  detail: string;
};

const STOP_PATTERNS: Array<{ re: RegExp; detail: string }> = [
  { re: /\bDROP\s+TABLE\s+(?!IF\s+EXISTS)/i, detail: "DROP TABLE without IF EXISTS" },
  { re: /\bTRUNCATE\b/i, detail: "TRUNCATE" },
  { re: /\bDROP\s+SCHEMA\b/i, detail: "DROP SCHEMA" },
];

export function auditMigrationSql(source: string, file: string): SqlAuditFinding[] {
  const findings: SqlAuditFinding[] = [];
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    for (const { re, detail } of STOP_PATTERNS) {
      if (re.test(line)) {
        findings.push({
          severity: "stop",
          pattern: re.source,
          line: i + 1,
          detail: `${file}: ${detail}`,
        });
      }
    }
  }
  if (!/\bcreate\s+table\s+if\s+not\s+exists\b/i.test(source) && /\bcreate\s+table\b/i.test(source)) {
    findings.push({
      severity: "warn",
      pattern: "create_table",
      line: 0,
      detail: `${file}: CREATE TABLE without IF NOT EXISTS (may fail on re-apply)`,
    });
  }
  return findings;
}

export function auditMigrationFiles(
  files: readonly string[],
  migrationsDir = resolve(process.cwd(), "supabase/migrations"),
): { files: string[]; findings: SqlAuditFinding[]; pass: boolean } {
  const findings: SqlAuditFinding[] = [];
  for (const file of files) {
    const path = resolve(migrationsDir, file);
    const source = readFileSync(path, "utf8");
    findings.push(...auditMigrationSql(source, file));
  }
  const pass = !findings.some(f => f.severity === "stop");
  return { files: [...files], findings, pass };
}
