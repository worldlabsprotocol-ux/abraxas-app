// FILE: scripts/demo/lib/demoMigration055Normalization.ts
// Fail-closed normalization for 055_policy_immutable_versions.sql only.

import { hashMigrationContent } from "./demoMigrationLedger";

export const DEMO_MIGRATION_055_FILENAME = "055_policy_immutable_versions.sql";

const TOP_LEVEL_TX_BEGIN = /^\s*begin\s*;\s*$/i;
const TOP_LEVEL_TX_COMMIT = /^\s*commit\s*;\s*$/i;

export class DemoMigration055NormalizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DemoMigration055NormalizationError";
  }
}

interface DollarQuoteState {
  inQuote: boolean;
  tag: string;
}

interface TopLevelTransactionControlScan {
  beginLineIndexes: number[];
  commitLineIndexes: number[];
}

function isCommentOnlyLine(line: string): boolean {
  return /^\s*--/.test(line);
}

function advanceDollarQuoteState(line: string, state: DollarQuoteState): void {
  let index = 0;
  while (index < line.length) {
    if (!state.inQuote) {
      const opener = line.slice(index).match(/^\$([A-Za-z0-9_]*)\$/);
      if (opener) {
        state.inQuote = true;
        state.tag = opener[1] ?? "";
        index += opener[0].length;
        continue;
      }

      if (line[index] === "'") {
        index += 1;
        while (index < line.length) {
          if (line[index] === "'" && line[index + 1] === "'") {
            index += 2;
            continue;
          }
          if (line[index] === "'") {
            index += 1;
            break;
          }
          index += 1;
        }
        continue;
      }

      index += 1;
      continue;
    }

    const closer = `$${state.tag}$`;
    const closeIndex = line.indexOf(closer, index);
    if (closeIndex >= 0) {
      state.inQuote = false;
      state.tag = "";
      index = closeIndex + closer.length;
      continue;
    }

    break;
  }
}

export function scanTopLevelTransactionControls(sql: string): TopLevelTransactionControlScan {
  const lines = sql.split(/\r?\n/);
  const beginLineIndexes: number[] = [];
  const commitLineIndexes: number[] = [];
  const dollarQuote: DollarQuoteState = { inQuote: false, tag: "" };

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex] ?? "";
    advanceDollarQuoteState(line, dollarQuote);

    if (dollarQuote.inQuote || isCommentOnlyLine(line)) {
      continue;
    }

    if (TOP_LEVEL_TX_BEGIN.test(line)) {
      beginLineIndexes.push(lineIndex);
    }
    if (TOP_LEVEL_TX_COMMIT.test(line)) {
      commitLineIndexes.push(lineIndex);
    }
  }

  return { beginLineIndexes, commitLineIndexes };
}

export interface Normalized055Migration {
  executionSql: string;
  sourceSha256: string;
}

export function normalize055MigrationForAtomicExecution(
  filename: string,
  sourceSql: string,
): Normalized055Migration {
  if (filename !== DEMO_MIGRATION_055_FILENAME) {
    throw new DemoMigration055NormalizationError(
      `055 normalization is only permitted for ${DEMO_MIGRATION_055_FILENAME}`,
    );
  }

  const sourceSha256 = hashMigrationContent(sourceSql);
  const scan = scanTopLevelTransactionControls(sourceSql);

  if (scan.beginLineIndexes.length === 0) {
    throw new DemoMigration055NormalizationError(
      `${DEMO_MIGRATION_055_FILENAME} is missing the required top-level BEGIN; statement`,
    );
  }
  if (scan.commitLineIndexes.length === 0) {
    throw new DemoMigration055NormalizationError(
      `${DEMO_MIGRATION_055_FILENAME} is missing the required top-level COMMIT; statement`,
    );
  }
  if (scan.beginLineIndexes.length > 1) {
    throw new DemoMigration055NormalizationError(
      `${DEMO_MIGRATION_055_FILENAME} contains multiple top-level BEGIN; statements`,
    );
  }
  if (scan.commitLineIndexes.length > 1) {
    throw new DemoMigration055NormalizationError(
      `${DEMO_MIGRATION_055_FILENAME} contains multiple top-level COMMIT; statements`,
    );
  }

  const beginLineIndex = scan.beginLineIndexes[0];
  const commitLineIndex = scan.commitLineIndexes[0];
  if (beginLineIndex === undefined || commitLineIndex === undefined) {
    throw new DemoMigration055NormalizationError(
      `${DEMO_MIGRATION_055_FILENAME} has an invalid top-level transaction structure`,
    );
  }
  if (beginLineIndex >= commitLineIndex) {
    throw new DemoMigration055NormalizationError(
      `${DEMO_MIGRATION_055_FILENAME} top-level BEGIN; must precede top-level COMMIT;`,
    );
  }

  const lines = sourceSql.split(/\r?\n/);
  const executionLines = lines.filter(
    (_, lineIndex) => lineIndex !== beginLineIndex && lineIndex !== commitLineIndex,
  );
  const executionSql = executionLines.join("\n").trim();

  if (!executionSql) {
    throw new DemoMigration055NormalizationError(
      `${DEMO_MIGRATION_055_FILENAME} normalization produced empty SQL`,
    );
  }

  const bodyBetweenControls = lines
    .slice(beginLineIndex + 1, commitLineIndex)
    .join("\n")
    .replace(/--[^\n]*/g, "")
    .trim();
  if (!bodyBetweenControls) {
    throw new DemoMigration055NormalizationError(
      `${DEMO_MIGRATION_055_FILENAME} normalization produced unexpected empty migration body`,
    );
  }

  const recheck = scanTopLevelTransactionControls(executionSql);
  if (recheck.beginLineIndexes.length > 0 || recheck.commitLineIndexes.length > 0) {
    throw new DemoMigration055NormalizationError(
      `${DEMO_MIGRATION_055_FILENAME} still contains top-level transaction-control statements after normalization`,
    );
  }

  return { executionSql, sourceSha256 };
}
