#!/usr/bin/env node
// Regenerate Section C ```javascript blocks from on-disk sources listed in Section A.

import { readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "examples/good-trouble-wix");
const MANIFEST_PATH = join(ROOT, "WIX_DEPLOYMENT_MANIFEST.md");

const manifest = readFileSync(MANIFEST_PATH, "utf8");
const sectionA = manifest.split("## B.")[0];
const inventoryPaths = [
  ...sectionA.matchAll(/`(examples\/good-trouble-wix\/[^`]+\.js)`/g),
].map((m) => m[1]);

/** @type {string[]} */
const blocks = [];

for (const repoPath of inventoryPaths) {
  const absolute = join(process.cwd(), repoPath);
  if (!statSync(absolute).isFile()) {
    console.warn(`skip non-file inventory path: ${repoPath}`);
    continue;
  }
  const relative = repoPath.replace("examples/good-trouble-wix/", "");
  const disk = readFileSync(absolute, "utf8").trimEnd();
  blocks.push(`### ${relative}\n\n\`\`\`javascript\n${disk}\n\`\`\``);
}

const sectionC = `\n\n${blocks.join("\n\n")}\n`;
const sectionDIndex = manifest.indexOf("\n## D.");
if (sectionDIndex === -1) {
  console.error("Section D not found");
  process.exit(1);
}

const beforeC = manifest.slice(0, manifest.indexOf("## C. Copy-ready source"));
const afterD = manifest.slice(sectionDIndex);
const updated = `${beforeC}## C. Copy-ready source${sectionC}${afterD}`;

writeFileSync(MANIFEST_PATH, updated);
console.log(`Rebuilt Section C for ${blocks.length} inventory files.`);
