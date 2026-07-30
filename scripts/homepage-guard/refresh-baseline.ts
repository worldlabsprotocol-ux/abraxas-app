#!/usr/bin/env npx tsx
// FILE: scripts/homepage-guard/refresh-baseline.ts
// Regenerate baseline snapshots — requires UI_APPROVED=true or --approved flag.

import { mkdirSync, writeFileSync, readFileSync, copyFileSync, existsSync } from "fs";
import { dirname, resolve } from "path";
import {
  baselinePath,
  extractHomeCss,
  isUiChangeApproved,
  loadManifest,
  readRepoFile,
  REPO_ROOT,
  sha256,
} from "./lib";

function ensureDir(filePath: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
}

function main(): void {
  const manifest = loadManifest();
  const force = process.argv.includes("--approved") || process.argv.includes("--force");
  if (!force && !isUiChangeApproved(manifest)) {
    console.error("Refusing to refresh homepage baseline without approval.");
    console.error("Set UI_APPROVED=true or pass --approved after an intentional [ui-change].");
    process.exit(1);
  }

  const written: string[] = [];

  for (const rel of manifest.protectedFiles) {
    const content = readRepoFile(rel);
    const dest = baselinePath(rel);
    ensureDir(dest);
    writeFileSync(dest, content, "utf8");
    written.push(rel);
  }

  const { source, baseline: baselineRel, startMarker } = manifest.protectedCss;
  const css = extractHomeCss(readRepoFile(source), startMarker);
  const cssDest = baselinePath(baselineRel);
  ensureDir(cssDest);
  writeFileSync(cssDest, `${css}\n`, "utf8");
  written.push(baselineRel);

  const logos = readRepoFile("lib/home/protocolProofLogos.ts");
  const media = readRepoFile("lib/home/protocolProofMedia.ts");
  const srcPattern = /src:\s*["']([^"']+)["']/g;
  const assetPaths = new Set<string>(manifest.protectedAssetPaths);
  for (const content of [logos, media]) {
    let match: RegExpExecArray | null;
    while ((match = srcPattern.exec(content)) !== null) {
      if (match[1].startsWith("/") && !match[1].includes("${")) {
        assetPaths.add(match[1]);
      }
    }
  }

  for (const publicPath of assetPaths) {
    const diskPath = resolve(REPO_ROOT, "public", publicPath.replace(/^\//, ""));
    if (!existsSync(diskPath)) {
      console.warn(`Skipping missing asset: ${publicPath}`);
      continue;
    }
    const dest = baselinePath(`assets${publicPath}`);
    ensureDir(dest);
    copyFileSync(diskPath, dest);
    written.push(`assets${publicPath}`);
  }

  const checksums: Record<string, string> = {};
  for (const rel of written) {
    const abs = baselinePath(rel);
    if (existsSync(abs)) {
      checksums[rel] = sha256(readFileSync(abs));
    }
  }
  const checksumPath = baselinePath("checksums.json");
  writeFileSync(checksumPath, `${JSON.stringify({ updatedAt: new Date().toISOString(), files: checksums }, null, 2)}\n`, "utf8");

  console.log(`✓ Homepage baseline refreshed (${written.length} artifacts)`);
  for (const w of written) console.log(`  · ${w}`);
}

main();
