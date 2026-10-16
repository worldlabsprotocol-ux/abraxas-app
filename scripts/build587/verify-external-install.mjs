#!/usr/bin/env node
/**
 * Clean-room install smoke + strict TypeScript contract check.
 */
import { mkdtempSync, writeFileSync, readFileSync, rmSync, readdirSync, copyFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const pkgDir = join(repoRoot, "packages/abraxas-institutional-verification");
const consumerExamples = join(repoRoot, "examples/external-sdk-consumer");

execSync("npm run build", { cwd: pkgDir, stdio: "inherit" });
const packDir = mkdtempSync(join(tmpdir(), "abraxas-sdk-pack-"));
execSync(`npm pack --pack-destination "${packDir}" --ignore-scripts`, { cwd: pkgDir, stdio: "pipe" });
const tgzName = readdirSync(packDir).find((name) => name.endsWith(".tgz"));
if (!tgzName) throw new Error("npm pack did not produce a tarball");
const tarball = join(packDir, tgzName);

const work = mkdtempSync(join(tmpdir(), "abraxas-sdk-consumer-"));
try {
  writeFileSync(
    join(work, "package.json"),
    JSON.stringify(
      {
        name: "abraxas-sdk-consumer-smoke",
        private: true,
        type: "module",
        dependencies: {
          "@abraxas/institutional-verification": `file:${tarball}`,
        },
        devDependencies: {
          typescript: "^5.8.3",
          "@types/node": "^22.13.10",
        },
      },
      null,
      2,
    ),
  );

  for (const name of ["smoke.mjs", "smoke.cjs", "verify-integration.ts", "tsconfig.json"]) {
    copyFileSync(join(consumerExamples, name), join(work, name));
  }

  execSync("npm install", { cwd: work, stdio: "inherit" });
  execSync("npm exec -- tsc -p tsconfig.json", { cwd: work, stdio: "inherit" });
  console.log("External TypeScript strict compile: OK");
  execSync("node smoke.mjs", { cwd: work, stdio: "inherit", env: { ...process.env, NODE_OPTIONS: "" } });
  execSync("node smoke.cjs", { cwd: work, stdio: "inherit", env: { ...process.env, NODE_OPTIONS: "" } });
  console.log("External install smoke passed:", work);
} finally {
  rmSync(work, { recursive: true, force: true });
  rmSync(packDir, { recursive: true, force: true });
}
