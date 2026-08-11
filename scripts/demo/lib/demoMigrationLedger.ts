// FILE: scripts/demo/lib/demoMigrationLedger.ts
// Shared migration content hashing utilities.

import { createHash } from "node:crypto";

export function hashMigrationContent(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}
