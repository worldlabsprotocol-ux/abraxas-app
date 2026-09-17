#!/usr/bin/env npx tsx
/**
 * Probe preview zklogin register binding (no OAuth tokens).
 * Uses header-only Vercel bypass when configured.
 */
import { resolveVercelProtectionBypass, vercelBypassHeaders } from "@/lib/preview/vercelBypass";

const PREVIEW_URL = (process.env.PREVIEW_URL ?? "").replace(/\/$/, "");
const BYPASS = resolveVercelProtectionBypass();

async function main() {
  if (!PREVIEW_URL) throw new Error("PREVIEW_URL required");

  const res = await fetch(`${PREVIEW_URL}/api/auth/zklogin/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...vercelBypassHeaders(BYPASS),
    },
    body: JSON.stringify({ id_token: "probe", oauth_sub: "probe" }),
  });

  const json = await res.json().catch(() => ({})) as Record<string, unknown>;
  console.log(JSON.stringify({
    status: res.status,
    code: json.code ?? null,
    error: json.error ?? null,
    expected_supabase_ref: json.expected_supabase_ref ?? null,
  }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
