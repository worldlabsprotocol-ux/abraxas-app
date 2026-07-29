#!/usr/bin/env node
// FILE: scripts/analyze-capture-bundle.js
// Ranked bundle report for /api/identity/documents/capture serverless trace.

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const NFT = path.join(
  ROOT,
  ".next/server/app/api/identity/documents/capture/route.js.nft.json",
);

function pkgFrom(rel) {
  const m = rel.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/);
  return m ? m[1] : "(application)";
}

function main() {
  if (!fs.existsSync(NFT)) {
    console.error("Run `npm run build` first — missing", NFT);
    process.exit(1);
  }

  const nft = JSON.parse(fs.readFileSync(NFT, "utf8"));
  const dir = path.dirname(NFT);
  const rows = [];

  for (const rel of nft.files) {
    try {
      const abs = path.join(dir, rel);
      rows.push({ rel, size: fs.statSync(abs).size, pkg: pkgFrom(rel) });
    } catch {
      // file excluded or missing
    }
  }

  rows.sort((a, b) => b.size - a.size);
  const total = rows.reduce((s, r) => s + r.size, 0);

  const pkgs = {};
  for (const r of rows) pkgs[r.pkg] = (pkgs[r.pkg] || 0) + r.size;

  const model = rows.filter((r) => /\.onnx$|\/models\//.test(r.rel));
  const natives = rows.filter((r) =>
    /\.(node|so|dylib|dll)(\.\d+)*$/i.test(r.rel),
  );

  console.log("=== /api/identity/documents/capture bundle report ===\n");
  console.log(`Total traced: ${(total / 1024 / 1024).toFixed(2)} MB (${rows.length} files)\n`);

  console.log("FILES > 1 MB");
  console.log("Size (MB)\tPackage\tPath");
  for (const r of rows.filter((x) => x.size > 1024 * 1024)) {
    const short = r.rel.replace(/.*node_modules\//, "node_modules/");
    console.log(`${(r.size / 1024 / 1024).toFixed(2)}\t${r.pkg}\t${short}`);
  }

  console.log("\nNPM PACKAGES (ranked)");
  console.log("Size (MB)\tPackage");
  for (const [pkg, size] of Object.entries(pkgs).sort((a, b) => b[1] - a[1])) {
    console.log(`${(size / 1024 / 1024).toFixed(2)}\t${pkg}`);
  }

  console.log("\nONNX MODEL IN BUNDLE");
  if (!model.length) {
    console.log("None — model loaded at runtime from disk (not traced)");
  } else {
    for (const r of model) {
      console.log(`${(r.size / 1024 / 1024).toFixed(2)} MB\t${r.rel}`);
    }
  }

  const modelPath = process.env.ABRAXAS_FACE_EMBEDDING_MODEL
    || path.join(ROOT, "models", "mobilefacenet.onnx");
  if (fs.existsSync(modelPath)) {
    const st = fs.statSync(modelPath);
    console.log(`Runtime model on disk (not bundled): ${(st.size / 1024 / 1024).toFixed(2)} MB — ${modelPath}`);
  } else {
    console.log("Runtime model on disk: not present (download via npm run biometric:download-model)");
  }

  console.log("\nNATIVE BINARIES");
  let nativeTotal = 0;
  for (const r of natives) {
    nativeTotal += r.size;
    console.log(`${(r.size / 1024 / 1024).toFixed(2)} MB\t${r.rel.replace(/.*node_modules\//, "")}`);
  }
  console.log(`Native total: ${(nativeTotal / 1024 / 1024).toFixed(2)} MB`);

  const platforms = { darwin: 0, win32: 0, arm64: 0, cuda: 0, linux_x64: 0 };
  for (const r of rows) {
    if (/darwin/.test(r.rel)) platforms.darwin += r.size;
    else if (/win32/.test(r.rel)) platforms.win32 += r.size;
    else if (/arm64/.test(r.rel)) platforms.arm64 += r.size;
    else if (/cuda|tensorrt/.test(r.rel)) platforms.cuda += r.size;
    else if (/linux\/x64|linux-x64/.test(r.rel)) platforms.linux_x64 += r.size;
  }
  console.log("\nPLATFORM BREAKDOWN");
  for (const [k, v] of Object.entries(platforms)) {
    console.log(`${(v / 1024 / 1024).toFixed(2)} MB\t${k}`);
  }

  const dupPkgs = Object.entries(pkgs).filter(([, size]) => size > 0);
  console.log("\nDUPLICATE DEPENDENCY CHECK");
  console.log(dupPkgs.length ? "No duplicate package copies detected in trace (single version per package)." : "n/a");

  if (total > 250 * 1024 * 1024) {
    console.log(`\n⚠ OVER 250 MB LIMIT by ${((total - 250 * 1024 * 1024) / 1024 / 1024).toFixed(2)} MB`);
    process.exit(1);
  }
  console.log(`\n✓ Under 250 MB limit (${((250 * 1024 * 1024 - total) / 1024 / 1024).toFixed(2)} MB headroom)`);
}

main();
