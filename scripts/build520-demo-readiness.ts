#!/usr/bin/env npx tsx
/**
 * Build #520 — read-only Demo readiness probe (no migrations, no production).
 */

import { PUBLIC_DEMO_ORIGIN } from "@/lib/product/publicOrigin";
import { DEMO_SUPABASE_PROJECT_REF } from "@/lib/supabase/projectRefs";

const DEMO_REF = DEMO_SUPABASE_PROJECT_REF;
const PRODUCTION_REF = "bztwutzprwsdrtqdpymf";

async function probeUrl(path: string): Promise<{ status: number; ok: boolean }> {
  const url = `${PUBLIC_DEMO_ORIGIN}${path}`;
  try {
    const res = await fetch(url, { method: "GET", redirect: "follow" });
    return { status: res.status, ok: res.ok };
  } catch (e) {
    return { status: 0, ok: false };
  }
}

async function main() {
  const routes = ["/", "/passport", "/cielo/verified-rate", "/partner/verify", "/developers/live-partner-journey"];
  console.log("Build #520 Demo readiness (read-only)\n");
  console.log(`Demo origin: ${PUBLIC_DEMO_ORIGIN}`);
  console.log(`Expected Supabase ref: ${DEMO_REF} (production ${PRODUCTION_REF} OFF LIMITS)\n`);

  for (const path of routes) {
    const r = await probeUrl(path);
    console.log(`${r.ok ? "OK" : "FAIL"} ${path} → HTTP ${r.status}`);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (url.includes(PRODUCTION_REF)) {
    console.log("\nBLOCKER: NEXT_PUBLIC_SUPABASE_URL points at production ref — abort any Demo E2E.");
  } else if (url.includes(DEMO_REF)) {
    console.log("\nLocal env bound to Demo Supabase ref.");
  } else if (!url) {
    console.log("\nNote: NEXT_PUBLIC_SUPABASE_URL unset locally — Vercel Demo env may still be correct.");
  }

  console.log("\nSchema 134–138: verify on Demo before claiming Solana-native partner receipts.");
  console.log("Founder action if blocked: apply authorized migrations per Build #516 gates + confirm Demo service role in Vercel Demo env only.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
