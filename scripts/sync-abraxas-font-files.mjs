#!/usr/bin/env node
/**
 * Copies OFL woff2 assets from @fontsource packages into app/fonts for next/font/local.
 * Run after upgrading @fontsource/* dependencies: npm run sync:fonts
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "app/fonts");

const copies = [
  ["@fontsource/plus-jakarta-sans", "plus-jakarta-sans", [400, 500, 600, 700, 800]],
  ["@fontsource/dm-sans", "dm-sans", [400, 500, 600, 700]],
  ["@fontsource/jetbrains-mono", "jetbrains-mono", [400, 500, 600]],
];

mkdirSync(outDir, { recursive: true });

for (const [pkg, prefix, weights] of copies) {
  for (const weight of weights) {
    const file = `${prefix}-latin-${weight}-normal.woff2`;
    const from = join(root, "node_modules", pkg, "files", file);
    const to = join(outDir, file);
    copyFileSync(from, to);
  }
}

console.log(`Synced ${copies.reduce((n, c) => n + c[2].length, 0)} woff2 files to app/fonts/`);
