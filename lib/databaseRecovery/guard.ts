// FILE: lib/databaseRecovery/guard.ts

import { AUTHORIZED_DEMO_SUPABASE_PROJECT_REF } from "@/lib/partner/launchpad/resolveInstitutionalStagingTarget";
import {
  assertDatabaseUrlMatchesDemoRef,
  parseSupabaseProjectRefFromDatabaseUrl,
} from "@/scripts/demo/lib/demoDatabaseUrl";
import {
  assertRefNotProductionTarget,
  collectProductionDeniedRefs,
  validateReadOnlyDemoConfig,
} from "@/scripts/demo/lib/demoProjectGuard";

export const AUTHORIZED_DEMO_REF = AUTHORIZED_DEMO_SUPABASE_PROJECT_REF;

export function assertDemoBackupScope(env: Record<string, string | undefined> = process.env): {
  demoProjectRef: string;
  databaseUrl: string;
} {
  validateReadOnlyDemoConfig(env);
  const demoRef = env.DEMO_SUPABASE_PROJECT_REF?.trim() ?? AUTHORIZED_DEMO_REF;
  if (demoRef !== AUTHORIZED_DEMO_REF) {
    throw new Error(
      `Build #552 demo backup is scoped to ${AUTHORIZED_DEMO_REF} only (got ${demoRef})`,
    );
  }

  const databaseUrl = env.DEMO_SUPABASE_DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error(
      "DEMO_SUPABASE_DATABASE_URL is required for PostgreSQL backup (Session Pooler or direct db.<ref>.supabase.co:5432)",
    );
  }

  assertDatabaseUrlMatchesDemoRef(databaseUrl, demoRef);
  const parsedRef = parseSupabaseProjectRefFromDatabaseUrl(databaseUrl);
  const denied = collectProductionDeniedRefs(env);
  assertRefNotProductionTarget(parsedRef, denied);

  return { demoProjectRef: demoRef, databaseUrl };
}

/** Restore targets must be operator-controlled disposable Postgres (never production/demo live). */
export function assertDisposableRestoreTarget(
  restoreUrl: string,
  env: Record<string, string | undefined> = process.env,
): void {
  let parsed: URL;
  try {
    parsed = new URL(restoreUrl.trim());
  } catch {
    throw new Error("ABRAXAS_RESTORE_DATABASE_URL is not a valid URL");
  }

  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new Error("ABRAXAS_RESTORE_DATABASE_URL must use postgres://");
  }

  const denied = collectProductionDeniedRefs(env);
  const host = parsed.hostname.toLowerCase();
  if (host.includes("supabase.co") || host.includes("pooler.supabase.com")) {
    throw new Error(
      "ABRAXAS_RESTORE_DATABASE_URL must not target Supabase hosts — use independently provisioned PostgreSQL",
    );
  }

  const username = decodeURIComponent(parsed.username);
  const password = decodeURIComponent(parsed.password);
  for (const ref of Array.from(denied)) {
    if (
      username.includes(ref)
      || password.includes(ref)
      || host.includes(ref)
      || parsed.pathname.includes(ref)
    ) {
      throw new Error("ABRAXAS_RESTORE_DATABASE_URL must not reference production project refs");
    }
  }

  const allowRemote = env.ABRAXAS_RESTORE_ALLOW_NONLOCALHOST?.trim() === "1";
  const isLocal = host === "localhost" || host === "127.0.0.1" || host.endsWith(".local");
  if (!isLocal && !allowRemote) {
    throw new Error(
      "ABRAXAS_RESTORE_DATABASE_URL must target localhost (or set ABRAXAS_RESTORE_ALLOW_NONLOCALHOST=1 for dedicated restore VM)",
    );
  }
}
