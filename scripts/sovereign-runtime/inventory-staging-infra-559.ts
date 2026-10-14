#!/usr/bin/env npx tsx
/**
 * Build #559 — redacted staging infrastructure inventory (no secrets).
 */
import { buildStagingInfraInventory } from "../../lib/sovereignRuntime/stagingInfraInventory";

console.log(JSON.stringify(buildStagingInfraInventory(process.env), null, 2));
