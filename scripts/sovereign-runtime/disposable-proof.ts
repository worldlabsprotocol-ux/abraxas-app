#!/usr/bin/env npx tsx
// FILE: scripts/sovereign-runtime/disposable-proof.ts
// Disposable Abraxas-operated PostgreSQL proof (no Supabase PostgREST).

import { execFileSync } from "node:child_process";

execFileSync(
  "./node_modules/.bin/vitest",
  ["run", "lib/sovereignRuntime/disposableProof.integration.test.ts"],
  { stdio: "inherit", env: process.env },
);
