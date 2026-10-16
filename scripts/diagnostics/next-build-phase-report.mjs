#!/usr/bin/env node
/**
 * Parse `npm run build` / next build stdout and emit phase durations.
 * Usage: npm run build 2>&1 | tee build.log; node scripts/diagnostics/next-build-phase-report.mjs build.log
 */
import { readFileSync } from "fs";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/diagnostics/next-build-phase-report.mjs <build.log>");
  process.exit(1);
}

const lines = readFileSync(file, "utf8").split(/\r?\n/);
const markers = [
  { id: "webpack_start", re: /Creating an optimized production build/i },
  { id: "webpack_done", re: /Compiled successfully|Compiled with warnings/i },
  { id: "page_data", re: /Collecting page data/i },
  { id: "ssg_start", re: /Generating static pages \(0\//i },
  { id: "ssg_done", re: /Generating static pages \(\d+\/\d+\)\s*$/ },
  { id: "finalize", re: /Finalizing page optimization/i },
  { id: "traces", re: /Collecting build traces/i },
  { id: "oom", re: /SIGKILL|Killed|JavaScript heap out of memory|Out of memory/i },
];

const hits = [];
for (let i = 0; i < lines.length; i++) {
  for (const m of markers) {
    if (m.re.test(lines[i])) hits.push({ line: i + 1, id: m.id, text: lines[i].trim() });
  }
}

console.log(JSON.stringify({ file, hits, stalledAfter: hits.length ? hits[hits.length - 1].id : null }, null, 2));
