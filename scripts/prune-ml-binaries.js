#!/usr/bin/env node
// FILE: scripts/prune-ml-binaries.js
// Vercel/Linux CI: remove non-linux-x64 ML native binaries after npm install.
// Keeps ONNX CPU inference working while cutting ~490 MB from serverless traces.

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

function rmrf(target) {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
    return true;
  }
  return false;
}

function pruneOnnxRuntime() {
  const binRoot = path.join(ROOT, "node_modules/onnxruntime-node/bin/napi-v3");
  if (!fs.existsSync(binRoot)) return { removed: 0, note: "onnxruntime-node not installed" };

  let removed = 0;
  for (const platform of ["darwin", "win32"]) {
    if (rmrf(path.join(binRoot, platform))) removed++;
  }
  if (rmrf(path.join(binRoot, "linux/arm64"))) removed++;

  const linuxX64 = path.join(binRoot, "linux/x64");
  for (const file of [
    "libonnxruntime_providers_cuda.so",
    "libonnxruntime_providers_tensorrt.so",
    "libonnxruntime.so.1.21.0", // soname loader uses libonnxruntime.so.1 only (~21 MB saved)
  ]) {
    const target = path.join(linuxX64, file);
    if (fs.existsSync(target)) {
      fs.unlinkSync(target);
      removed++;
    }
  }
  return { removed, note: "onnxruntime-node pruned to linux/x64 CPU" };
}

function pruneSharpPlatforms() {
  const imgDir = path.join(ROOT, "node_modules/@img");
  if (!fs.existsSync(imgDir)) return { removed: 0, note: "no @img packages" };

  const keep = new Set([
    "colour",
    "sharp-linux-x64",
    "sharp-libvips-linux-x64",
  ]);

  let removed = 0;
  for (const entry of fs.readdirSync(imgDir)) {
    if (keep.has(entry)) continue;
    if (rmrf(path.join(imgDir, entry))) removed++;
  }
  return { removed, note: "sharp pruned to linux-x64" };
}

function main() {
  if (process.env.SKIP_ML_BINARY_PRUNE === "1") {
    console.log("[prune-ml-binaries] SKIP_ML_BINARY_PRUNE=1 — skipping");
    return;
  }

  // Only prune on Linux x64 (Vercel). Preserve macOS/Windows local ONNX dev.
  if (process.platform !== "linux" || process.arch !== "x64") {
    console.log(`[prune-ml-binaries] skip on ${process.platform}/${process.arch}`);
    return;
  }

  const onnx = pruneOnnxRuntime();
  const sharp = pruneSharpPlatforms();
  console.log("[prune-ml-binaries]", onnx.note, `(${onnx.removed} paths)`);
  console.log("[prune-ml-binaries]", sharp.note, `(${sharp.removed} paths)`);
}

main();
