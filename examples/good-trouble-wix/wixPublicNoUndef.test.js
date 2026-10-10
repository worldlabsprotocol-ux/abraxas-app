// FILE: examples/good-trouble-wix/wixPublicNoUndef.test.js
// Wix Velo ESLint no-undef guard: re-exported symbols must be imported for local use.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd(), "examples/good-trouble-wix");
const PUBLIC_DIR = join(ROOT, "public");

const KNOWN_GLOBALS = new Set([
  "console",
  "Date",
  "JSON",
  "Math",
  "Object",
  "Promise",
  "Set",
  "Map",
  "Error",
  "URL",
  "URLSearchParams",
  "encodeURIComponent",
  "decodeURIComponent",
  "setTimeout",
  "clearTimeout",
  "undefined",
  "null",
  "true",
  "false",
]);

function parseNamedImportExports(source) {
  /** @type {Set<string>} */
  const imported = new Set();
  /** @type {Set<string>} */
  const reExportedOnly = new Set();

  for (const match of source.matchAll(/import\s*\{([^}]+)\}\s*from\s*["'][^"']+["']/g)) {
    for (const part of match[1].split(",")) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const asSplit = trimmed.split(/\s+as\s+/);
      const local = (asSplit[1] ?? asSplit[0]).trim();
      imported.add(local);
    }
  }

  for (const match of source.matchAll(/export\s*\{([^}]+)\}\s*from\s*["'][^"']+["']/g)) {
    for (const part of match[1].split(",")) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const name = trimmed.split(/\s+as\s+/)[0].trim();
      if (name && !imported.has(name)) {
        reExportedOnly.add(name);
      }
    }
  }

  return { imported, reExportedOnly };
}

function localDeclarations(source) {
  /** @type {Set<string>} */
  const declared = new Set();
  for (const match of source.matchAll(
    /export\s+(?:async\s+)?function\s+(\w+)|function\s+(\w+)|const\s+(\w+)\s*=|let\s+(\w+)\s*=|class\s+(\w+)/g,
  )) {
    const name = match[1] ?? match[2] ?? match[3] ?? match[4] ?? match[5];
    if (name) declared.add(name);
  }
  return declared;
}

function findLocalUsesOfReExports(source, reExportedOnly) {
  /** @type {string[]} */
  const violations = [];
  const bodyWithoutReExportLines = source
    .split("\n")
    .filter((line) => !/^\s*export\s*\{[^}]+\}\s*from\s*["']/.test(line))
    .join("\n");

  for (const symbol of reExportedOnly) {
    const callPattern = new RegExp(`\\b${symbol}\\s*\\(`);
    if (callPattern.test(bodyWithoutReExportLines)) {
      violations.push(symbol);
    }
  }
  return violations;
}

describe("Wix public modules — no-undef (re-export vs local use)", () => {
  const publicFiles = readdirSync(PUBLIC_DIR).filter(
    (name) => name.endsWith(".js") && !name.endsWith(".test.js"),
  );

  for (const file of publicFiles) {
    it(`${file} does not call re-export-only symbols without importing them`, () => {
      const source = readFileSync(join(PUBLIC_DIR, file), "utf8");
      const { imported, reExportedOnly } = parseNamedImportExports(source);
      const declared = localDeclarations(source);
      const violations = findLocalUsesOfReExports(source, reExportedOnly).filter(
        (sym) => !declared.has(sym) && !imported.has(sym) && !KNOWN_GLOBALS.has(sym),
      );
      expect(violations, `import for local use: ${violations.join(", ")}`).toEqual([]);
    });
  }

  it("browseCallbackLogic resolveBrowseReturnDestinationForStart uses imported extractSameOriginPath", async () => {
    const mod = await import("./public/browseCallbackLogic.js");
    expect(mod.extractSameOriginPath).toBeTypeOf("function");
    expect(
      mod.resolveBrowseReturnDestinationForStart({
        currentUrl: "https://www.goodtroublecanna.com/goods?x=1",
      }),
    ).toBe("/goods");
  });
});
