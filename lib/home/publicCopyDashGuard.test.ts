// FILE: lib/home/publicCopyDashGuard.test.ts

import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join, resolve } from "path";
import { describe, expect, it } from "vitest";
import { scanSourceLineForPublicCopyViolations } from "./publicCopyPunctuationScan";

const ROOT = resolve(__dirname, "../..");

function collectFiles(dir: string, acc: string[] = []): string[] {
  const abs = join(ROOT, dir);
  if (!existsSync(abs)) return acc;
  for (const entry of readdirSync(abs)) {
    const rel = join(dir, entry);
    const full = join(ROOT, rel);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "baseline" || entry === "elite" || entry === "productVisual") continue;
      collectFiles(rel, acc);
    } else if (/\.(tsx|ts)$/.test(entry) && !/\.(test|spec)\.(tsx|ts)$/.test(entry)) {
      acc.push(rel);
    }
  }
  return acc;
}

const PUBLIC_COPY_PATHS = [
  ...collectFiles("components/home"),
  ...collectFiles("components/redesign"),
  ...collectFiles("components/protocol-visuals"),
  ...collectFiles("components/passport"),
  ...collectFiles("lib/home").filter((p) => !p.endsWith("publicCopyDashGuard.test.ts") && !p.endsWith("publicCopyPunctuationScan.ts")),
  "components/institutional/CapabilityMatrix.tsx",
  "components/institutional/InstitutionalHomeClose.tsx",
  "app/page.tsx",
].filter((p, i, arr) => arr.indexOf(p) === i);

function scanFile(rel: string): string[] {
  const path = join(ROOT, rel);
  expect(existsSync(path), `missing public copy file: ${rel}`).toBe(true);
  const lines = readFileSync(path, "utf8").split("\n");
  const violations: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    for (const v of scanSourceLineForPublicCopyViolations(lines[i])) {
      violations.push(`${i + 1}: ${v}`);
    }
  }
  return violations;
}

describe("public copy punctuation guard (Build #566)", () => {
  it(`scans ${PUBLIC_COPY_PATHS.length} homepage and Passport source files`, () => {
    expect(PUBLIC_COPY_PATHS.length).toBeGreaterThan(40);
  });

  for (const rel of PUBLIC_COPY_PATHS) {
    it(`prohibited punctuation in ${rel}`, () => {
      const violations = scanFile(rel);
      expect(violations, violations.join("\n")).toEqual([]);
    });
  }
});
