#!/usr/bin/env npx tsx
import { writeFileSync, mkdirSync } from "node:fs";
import { buildSandboxEnvironmentManifest } from "@/lib/institutional/sandbox/sandboxEnvironmentManifest";

const OUT = "/opt/cursor/artifacts/institutional-sandbox-environment-manifest-v528.json";

function main() {
  mkdirSync("/opt/cursor/artifacts", { recursive: true });
  const manifest = buildSandboxEnvironmentManifest();
  writeFileSync(OUT, JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify({ schema: manifest.schema, out: OUT }, null, 2));
}

main();
