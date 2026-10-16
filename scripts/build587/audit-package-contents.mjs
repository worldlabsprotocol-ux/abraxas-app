#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const pkgRoot = join(process.cwd(), "packages/abraxas-institutional-verification");
const forbidden = [
  /\.env/i,
  /private.*key/i,
  /ABRAXAS_SIGNING_KEY/,
  /supabase\/migrations/,
  /\.pem$/,
  /service_role/i,
];

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, files);
    else files.push(p);
  }
  return files;
}

const targets = [
  join(pkgRoot, "dist"),
  join(pkgRoot, "fixtures"),
].filter((p) => {
  try {
    statSync(p);
    return true;
  } catch {
    return false;
  }
});

const violations = [];
for (const root of targets) {
  for (const file of walk(root)) {
    const rel = file.slice(pkgRoot.length + 1);
    if (forbidden.some((re) => re.test(rel))) violations.push(rel);
    if (file.endsWith(".js") || file.endsWith(".cjs")) {
      const text = readFileSync(file, "utf8");
      if (text.includes("requireSupabaseAdmin") && !text.includes("not available in @abraxas")) {
        if (text.includes("../../lib/supabase/admin")) violations.push(`${rel}: live supabase import`);
      }
      if (text.includes("viem/")) violations.push(`${rel}: viem bundled`);
    }
  }
}

if (violations.length) {
  console.error("Package contents audit failed:\n", violations.join("\n"));
  process.exit(1);
}
console.log("Package contents audit passed.");
