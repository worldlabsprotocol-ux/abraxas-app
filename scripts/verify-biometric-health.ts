#!/usr/bin/env npx tsx
// FILE: scripts/verify-biometric-health.ts
// Smoke-check production health endpoints (local or deployed).

const BASE = process.env.ABRAXAS_HEALTH_BASE_URL ?? "http://localhost:3000";

const ENDPOINTS = [
  "/api/health",
  "/api/idv/health",
  "/api/idv/independent/status",
  "/api/idv/biometric/status",
  "/api/verify/layer",
  "/api/mainnet/readiness",
];

async function check(path: string) {
  const url = `${BASE}${path}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    return {
      path,
      status: res.status,
      ok: res.ok,
      summary: typeof body.summary === "string"
        ? body.summary.slice(0, 120)
        : body.status ?? body.label ?? JSON.stringify(body).slice(0, 80),
    };
  } catch (err) {
    return {
      path,
      status: 0,
      ok: false,
      summary: err instanceof Error ? err.message : "fetch failed",
    };
  }
}

async function main() {
  console.log(`=== Health check: ${BASE} ===\n`);
  const results = await Promise.all(ENDPOINTS.map(check));

  let allOk = true;
  for (const r of results) {
    const mark = r.ok ? "✓" : "✗";
    if (!r.ok) allOk = false;
    console.log(`${mark} ${r.status} ${r.path}`);
    console.log(`  ${r.summary}\n`);
  }

  process.exit(allOk ? 0 : 1);
}

main();
