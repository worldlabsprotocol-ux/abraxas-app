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
  const bindingSignal = res.status === 503 && json.code === "preview_supabase_not_demo_bound"
    ? "url_points_to_production_supabase"
    : res.status === 401
      ? "url_passed_demo_binding_gate_or_invalid_token"
      : null;

  console.log(JSON.stringify({
    status: res.status,
    code: json.code ?? null,
    error: json.error ?? null,
    expected_supabase_ref: json.expected_supabase_ref ?? null,
    binding_signal: bindingSignal,
  }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
