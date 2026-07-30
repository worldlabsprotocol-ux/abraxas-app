#!/usr/bin/env npx tsx
// FILE: scripts/homepage-guard/check.ts
// CI guard — protected homepage must match committed baseline. No silent drift.

import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { execSync } from "child_process";
import {
  baselinePath,
  extractHomeCss,
  isUiChangeApproved,
  loadManifest,
  readRepoFile,
  REPO_ROOT,
  sha256,
  type FileDiff,
} from "./lib";

function checkProtectedFiles(manifest: ReturnType<typeof loadManifest>): FileDiff[] {
  const diffs: FileDiff[] = [];

  for (const rel of manifest.protectedFiles) {
    const current = readRepoFile(rel);
    const baseFile = baselinePath(rel);
    if (!existsSync(baseFile)) {
      diffs.push({ path: rel, kind: "file", detail: "baseline snapshot missing — run npm run homepage:baseline:refresh" });
      continue;
    }
    const baseline = readFileSync(baseFile, "utf8");
    if (sha256(current) !== sha256(baseline)) {
      diffs.push({
        path: rel,
        kind: "file",
        detail: `content differs from baseline (hash ${sha256(current).slice(0, 12)}… ≠ ${sha256(baseline).slice(0, 12)}…)`,
      });
    }
  }

  const { source, baseline: baselineRel, startMarker } = manifest.protectedCss;
  const globals = readRepoFile(source);
  const currentCss = extractHomeCss(globals, startMarker);
  const baseCssPath = baselinePath(baselineRel);
  if (!existsSync(baseCssPath)) {
    diffs.push({ path: source, kind: "css", detail: "homepage CSS baseline missing" });
  } else {
    const baselineCss = readFileSync(baseCssPath, "utf8");
    if (sha256(currentCss.trimEnd()) !== sha256(baselineCss.trimEnd())) {
      diffs.push({
        path: source,
        kind: "css",
        detail: "abx-home-* CSS block differs from baseline",
      });
    }
  }

  return diffs;
}

function checkCriticalMarkers(manifest: ReturnType<typeof loadManifest>): FileDiff[] {
  const diffs: FileDiff[] = [];

  for (const marker of manifest.criticalMarkers) {
    const content = readRepoFile(marker.file);
    for (const needle of marker.mustContain) {
      if (!content.includes(needle)) {
        diffs.push({
          path: marker.file,
          kind: "marker",
          detail: `missing required marker "${needle}" (${marker.id})`,
        });
      }
    }
  }

  return diffs;
}

function checkProtectedAssets(manifest: ReturnType<typeof loadManifest>): FileDiff[] {
  const diffs: FileDiff[] = [];
  const logos = readRepoFile("lib/home/protocolProofLogos.ts");
  const media = readRepoFile("lib/home/protocolProofMedia.ts");
  const partnerNetwork = readRepoFile("lib/home/partnerNetwork.ts");

  const srcPattern = /src:\s*["']([^"']+)["']/g;
  const assetPaths = new Set<string>(manifest.protectedAssetPaths);
  for (const content of [logos, media, partnerNetwork]) {
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
      diffs.push({
        path: publicPath,
        kind: "asset",
        detail: "referenced homepage asset missing from public/",
      });
      continue;
    }
    const baseAsset = baselinePath(`assets${publicPath}`);
    if (existsSync(baseAsset)) {
      const currentHash = sha256(readFileSync(diskPath));
      const baseHash = sha256(readFileSync(baseAsset));
      if (currentHash !== baseHash) {
        diffs.push({
          path: publicPath,
          kind: "asset",
          detail: `asset bytes differ from baseline (hash ${currentHash.slice(0, 12)}…)`,
        });
      }
    }
  }

  return diffs;
}

function protectedPathsTouchedInPr(manifest: ReturnType<typeof loadManifest>): string[] {
  const baseRef = process.env.GITHUB_BASE_REF
    ? `origin/${process.env.GITHUB_BASE_REF}`
    : "origin/main";

  let diffOutput = "";
  try {
    execSync(`git fetch origin ${process.env.GITHUB_BASE_REF ?? "main"} --depth=1`, {
      cwd: REPO_ROOT,
      stdio: "pipe",
    });
    diffOutput = execSync(`git diff --name-only ${baseRef}...HEAD`, {
      cwd: REPO_ROOT,
      encoding: "utf8",
    });
  } catch {
    try {
      diffOutput = execSync("git diff --name-only HEAD~1..HEAD", {
        cwd: REPO_ROOT,
        encoding: "utf8",
      });
    } catch {
      return [];
    }
  }

  const changed = new Set(diffOutput.split("\n").filter(Boolean));
  const protectedSources = new Set([
    ...manifest.protectedFiles,
    manifest.protectedCss.source,
  ]);

  return [...changed].filter(path => [...protectedSources].some(p => path === p));
}

function printReport(diffs: FileDiff[], prApprovalRequired: boolean): void {
  console.error("\n╔══════════════════════════════════════════════════════════════╗");
  console.error("║  HOMEPAGE GUARD — protected surface regression detected      ║");
  console.error("╚══════════════════════════════════════════════════════════════╝\n");

  const groups: Array<[string, FileDiff[]]> = [
    ["Critical markers removed", diffs.filter(d => d.kind === "marker")],
    ["Protected CSS changed", diffs.filter(d => d.kind === "css")],
    ["Protected components changed", diffs.filter(d => d.kind === "file")],
    ["Protected assets changed or missing", diffs.filter(d => d.kind === "asset")],
  ];

  for (const [title, items] of groups) {
    if (!items.length) continue;
    console.error(`${title}:`);
    for (const d of items) console.error(`  ✗ [${d.path}] ${d.detail}`);
    console.error("");
  }

  if (prApprovalRequired) {
    console.error("Protected homepage paths were modified without [ui-change] approval.");
    console.error("Add [ui-change] to the PR title or description, or set UI_APPROVED=true.\n");
  }

  console.error("To fix an unintentional regression:");
  console.error("  git checkout HEAD -- <protected-file>   # restore file");
  console.error("  npm run check:homepage-guard            # verify\n");
  console.error("To land an intentional redesign:");
  console.error("  1. Add [ui-change] to PR title");
  console.error("  2. Make design edits");
  console.error("  3. npm run homepage:baseline:refresh");
  console.error("  4. Commit baseline snapshots under scripts/homepage-guard/baseline/\n");
  console.error("Manifest: scripts/homepage-guard/manifest.json\n");
}

function main(): void {
  const manifest = loadManifest();
  const markerDiffs = checkCriticalMarkers(manifest);
  const fileDiffs = checkProtectedFiles(manifest);
  const assetDiffs = checkProtectedAssets(manifest);
  const allDiffs = [...markerDiffs, ...fileDiffs, ...assetDiffs];

  const touched = process.env.GITHUB_ACTIONS === "true" ? protectedPathsTouchedInPr(manifest) : [];
  const approved = isUiChangeApproved(manifest);
  const prApprovalRequired = touched.length > 0 && !approved;

  if (allDiffs.length === 0 && !prApprovalRequired) {
    console.log("✓ Homepage guard: protected baseline intact");
    process.exit(0);
  }

  printReport(allDiffs, prApprovalRequired);

  if (allDiffs.length > 0 || prApprovalRequired) {
    process.exit(1);
  }

  process.exit(0);
}

main();
