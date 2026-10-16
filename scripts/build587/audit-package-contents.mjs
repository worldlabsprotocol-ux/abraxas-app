#!/usr/bin/env node
/**
 * Audit the packed SDK tarball (not just the working tree).
 */
import { readFileSync, readdirSync, statSync, mkdtempSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const pkgDir = join(repoRoot, "packages/abraxas-institutional-verification");

const forbiddenPath = [
  /\.env/i,
  /private.*key/i,
  /\.pem$/,
  /service_role/i,
  /supabase\/migrations/i,
  /node_modules\//,
];

const forbiddenContent = [
  /requireSupabaseAdmin\(\)/,
  /sourcesContent/,
  /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/,
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

execSync("npm run build", { cwd: pkgDir, stdio: "inherit" });
const packDir = mkdtempSync(join(tmpdir(), "abraxas-sdk-audit-pack-"));
const extractDir = mkdtempSync(join(tmpdir(), "abraxas-sdk-audit-extract-"));

try {
  execSync(`npm pack --pack-destination "${packDir}" --ignore-scripts`, { cwd: pkgDir, stdio: "pipe" });
  const tgz = readdirSync(packDir).find((name) => name.endsWith(".tgz"));
  if (!tgz) throw new Error("npm pack produced no tarball");
  execSync(`tar -xzf "${join(packDir, tgz)}" -C "${extractDir}"`, { stdio: "pipe" });
  const packageRoot = join(extractDir, "package");
  const violations = [];

  for (const file of walk(packageRoot)) {
    const rel = file.slice(packageRoot.length + 1);
    if (forbiddenPath.some((re) => re.test(rel))) {
      violations.push(`forbidden path: ${rel}`);
    }
    if (rel.endsWith(".map")) {
      violations.push(`source map shipped in tarball: ${rel}`);
    }
    const text = readFileSync(file, "utf8");
    if (rel.endsWith(".js") || rel.endsWith(".cjs") || rel.endsWith(".json") || rel.endsWith(".md")) {
      for (const re of forbiddenContent) {
        if (re.test(text)) {
          violations.push(`${rel}: matched ${re}`);
        }
      }
    }
    if ((rel.endsWith(".js") || rel.endsWith(".cjs")) && text.includes("viem/")) {
      violations.push(`${rel}: viem bundled`);
    }
    if ((rel.endsWith(".js") || rel.endsWith(".cjs")) && /from\s+["']\.\.\/\.\.\/lib\//.test(text)) {
      violations.push(`${rel}: runtime import from repository lib path`);
    }
  }

  // Synthetic fixtures must not ship private JWK material
  const registryPath = join(packageRoot, "fixtures/synthetic/trust-registry.json");
  if (statSync(registryPath, { throwIfNoEntry: false })) {
    const registry = readFileSync(registryPath, "utf8");
    if (registry.includes('"d"')) {
      violations.push("fixtures/synthetic/trust-registry.json: private JWK field d");
    }
  }

  if (violations.length) {
    console.error("Package tarball audit failed:\n", violations.join("\n"));
    process.exit(1);
  }
  console.log(`Package tarball audit passed (${tgz}).`);
} finally {
  rmSync(packDir, { recursive: true, force: true });
  rmSync(extractDir, { recursive: true, force: true });
}
