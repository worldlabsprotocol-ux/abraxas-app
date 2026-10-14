#!/usr/bin/env npx tsx
/** Redacted provider dependency audit (Build #561) — no secrets emitted. */
import { buildSovereignDependencyAudit } from "../../lib/sovereignRuntime/sovereignDependencyAudit";

console.log(JSON.stringify(buildSovereignDependencyAudit(process.env), null, 2));
