#!/usr/bin/env tsx
/** Prefer: `npm run accept:build-976-local` (vitest — resolves server-only imports). */
import { spawnSync } from "node:child_process";

const result = spawnSync(
  "npm",
  [
    "run",
    "accept:build-976-local",
  ],
  { stdio: "inherit", env: { ...process.env, ABRAXAS_BUILD976_LOCAL_ACCEPTANCE: "1" } },
);
process.exit(result.status ?? 1);