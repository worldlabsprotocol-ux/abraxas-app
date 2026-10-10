#!/usr/bin/env npx tsx
// Read-only Solana Demo preflight — does not mutate remote env or run migrations.

import { createClient } from "@supabase/supabase-js";
import {
  formatSolanaNativeDemoPreflightReport,
  runSolanaNativeDemoPreflight,
} from "@/lib/integration/solanaNativeDemoPreflight";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const sb = url && key
    ? createClient(url, key, { auth: { persistSession: false } })
    : null;

  const result = await runSolanaNativeDemoPreflight({
    env: process.env,
    tableExists: sb
      ? async (table) => {
          const { error } = await sb.from(table).select("*", { head: true, count: "exact" });
          return !error;
        }
      : undefined,
  });

  console.log(formatSolanaNativeDemoPreflightReport(result));
  process.exit(result.exitCode);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
