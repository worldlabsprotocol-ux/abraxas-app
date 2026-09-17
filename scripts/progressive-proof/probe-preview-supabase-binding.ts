#!/usr/bin/env npx tsx
/**
 * Probe preview server-side Supabase binding (project refs only; no secrets).
 */
import { resolveVercelProtectionBypass, vercelBypassHeaders } from "@/lib/preview/vercelBypass";

const PREVIEW_URL = (process.env.PREVIEW_URL ?? "").replace(/\/$/, "");
const BYPASS = resolveVercelProtectionBypass();

async function main() {
  if (!PREVIEW_URL) throw new Error("PREVIEW_URL required");
  if (!BYPASS) throw new Error("VERCEL_PROTECTION_BYPASS required for preview probe");

  const res = await fetch(`${PREVIEW_URL}/api/preview/supabase-binding`, {
    headers: vercelBypassHeaders(BYPASS),
  });
  const json = await res.json().catch(() => ({})) as Record<string, unknown>;
  console.log(JSON.stringify({ status: res.status, ...json }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
