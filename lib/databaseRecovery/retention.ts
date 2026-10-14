// FILE: lib/databaseRecovery/retention.ts

import { readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";

function listEncryptedBackups(outputDir: string): { path: string; mtimeMs: number }[] {
  let names: string[];
  try {
    names = readdirSync(outputDir);
  } catch {
    return [];
  }

  return names
    .filter((name) => name.endsWith(".dump.enc"))
    .map((name) => {
      const path = join(outputDir, name);
      return { path, mtimeMs: statSync(path).mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
}

/** Keep the newest N encrypted backups and their manifest sidecars. */
export function pruneBackupArtifacts(outputDir: string, keepLast: number): string[] {
  if (keepLast < 1) return [];
  const backups = listEncryptedBackups(outputDir);
  const removed: string[] = [];
  for (const entry of backups.slice(keepLast)) {
    unlinkSync(entry.path);
    removed.push(entry.path);
    const manifest = `${entry.path}.manifest.json`;
    try {
      unlinkSync(manifest);
      removed.push(manifest);
    } catch {
      // manifest may already be absent
    }
  }
  return removed;
}
