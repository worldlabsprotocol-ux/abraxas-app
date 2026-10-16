#!/usr/bin/env node
/**
 * Sample aggregated Node RSS while a build command runs.
 * Usage:
 *   node scripts/diagnostics/measure-next-build-memory.mjs --label baseline-full -- npm run build
 *   node scripts/diagnostics/measure-next-build-memory.mjs --label compile-only -- npm run build:compile
 */
import { spawn, execSync } from "child_process";
import { writeFileSync } from "fs";

function sumNodeRssKiB() {
  try {
    const out = execSync("ps -C node -o rss= 2>/dev/null || true", { encoding: "utf8" });
    return out
      .trim()
      .split(/\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .reduce((acc, n) => acc + Number(n), 0);
  } catch {
    return 0;
  }
}

const args = process.argv.slice(2);
const labelIdx = args.indexOf("--label");
const label = labelIdx >= 0 ? args[labelIdx + 1] : "build";
const cmdStart = args.indexOf("--");
const cmd = cmdStart >= 0 ? args.slice(cmdStart + 1) : ["npm", "run", "build"];

const startedAt = new Date().toISOString();
let maxRssKiB = 0;
let samples = 0;

const child = spawn(cmd[0], cmd.slice(1), {
  stdio: ["ignore", "pipe", "pipe"],
  env: process.env,
  shell: false,
});

let stdout = "";
let stderr = "";
child.stdout.on("data", (d) => {
  stdout += d.toString();
});
child.stderr.on("data", (d) => {
  stderr += d.toString();
});

const interval = setInterval(() => {
  samples += 1;
  const sum = sumNodeRssKiB();
  if (sum > maxRssKiB) maxRssKiB = sum;
}, 2000);

child.on("close", (code) => {
  clearInterval(interval);
  const combined = stdout + stderr;
  const phases = {
    webpackStart: /Creating an optimized production build/i.test(combined),
    compiled: /Compiled successfully|Compiled with warnings/i.test(combined),
    lintType: /Linting and checking validity of types/i.test(combined),
    skipLint: /Skipping linting/i.test(combined),
    skipTypes: /Skipping validation of types/i.test(combined),
    pageData: /Collecting page data/i.test(combined),
    ssg: /Generating static pages/i.test(combined),
    oom: /SIGKILL|Killed|heap out of memory|Out of memory/i.test(combined),
  };
  const report = {
    label,
    startedAt,
    finishedAt: new Date().toISOString(),
    command: cmd.join(" "),
    exitCode: code,
    peakNodeRssKiB: maxRssKiB,
    peakNodeRssGiB: Number((maxRssKiB / 1024 / 1024).toFixed(2)),
    samples,
    phases,
  };
  const outPath = `/opt/cursor/artifacts/build590-memory-${label.replace(/[^a-z0-9_-]+/gi, "-")}.json`;
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(code ?? 1);
});
