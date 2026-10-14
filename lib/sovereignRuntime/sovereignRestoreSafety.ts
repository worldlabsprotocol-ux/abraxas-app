// FILE: lib/sovereignRuntime/sovereignRestoreSafety.ts
// Staging restore drill safety — authorization, endpoint separation, live DB identity.

import type { PgQueryable } from "@/lib/databaseRecovery/pgInventory";
import type { SovereignActivationIssue } from "./sovereignActivationPolicy";
import {
  assertDistinctPostgresEndpoints,
  parsePostgresEndpoint,
  postgresEndpointsEqual,
} from "./pgConnectionIdentity";

export function assertStagingRestoreDrillAuthorized(
  env: Record<string, string | undefined>,
): SovereignActivationIssue[] {
  const errors: SovereignActivationIssue[] = [];
  if (env.ABRAXAS_SOVEREIGN_STAGING_RESTORE_DRILL_AUTHORIZED?.trim() !== "true") {
    errors.push({
      code: "staging_restore_drill_not_authorized",
      message:
        "Staging restore drills require ABRAXAS_SOVEREIGN_STAGING_RESTORE_DRILL_AUTHORIZED=true after explicit operator review",
    });
  }
  const operator = env.ABRAXAS_SOVEREIGN_STAGING_RESTORE_OPERATOR_AUTHORIZATION?.trim();
  const expected = env.ABRAXAS_SOVEREIGN_STAGING_RESTORE_OPERATOR_AUTHORIZATION_EXPECTED?.trim();
  if (!operator || !expected || operator !== expected) {
    errors.push({
      code: "staging_restore_operator_authorization_required",
      message:
        "Staging restore drills require matching ABRAXAS_SOVEREIGN_STAGING_RESTORE_OPERATOR_AUTHORIZATION and _EXPECTED",
    });
  }
  return errors;
}

export async function readConnectedDatabaseName(client: PgQueryable): Promise<string> {
  const result = await client.query<{ name: string }>("select current_database() as name");
  return result.rows[0]?.name ?? "";
}

/** Verify live connection matches URL path and is not the primary staging database. */
export async function assertRestoreTargetLiveIdentity(input: {
  primaryUrl: string;
  restoreUrl: string;
  primaryClient: PgQueryable;
  restoreClient: PgQueryable;
}): Promise<SovereignActivationIssue | null> {
  const endpointErr = assertDistinctPostgresEndpoints(input.primaryUrl, input.restoreUrl);
  if (endpointErr) {
    return { code: endpointErr.code, message: endpointErr.message };
  }

  const primaryEp = parsePostgresEndpoint(input.primaryUrl);
  const restoreEp = parsePostgresEndpoint(input.restoreUrl);
  if (!primaryEp.ok || !restoreEp.ok) {
    return {
      code: "invalid_database_url",
      message: "Could not parse primary or restore database URL",
    };
  }

  const primaryLive = await readConnectedDatabaseName(input.primaryClient);
  const restoreLive = await readConnectedDatabaseName(input.restoreClient);

  if (primaryLive !== primaryEp.endpoint.database) {
    return {
      code: "primary_live_database_mismatch",
      message: "Primary connection current_database() does not match ABRAXAS_DATABASE_URL database name",
    };
  }
  if (restoreLive !== restoreEp.endpoint.database) {
    return {
      code: "restore_live_database_mismatch",
      message: "Restore connection current_database() does not match ABRAXAS_SOVEREIGN_RESTORE_PG_URL database name",
    };
  }

  if (primaryLive === restoreLive) {
    return {
      code: "restore_live_target_equals_primary",
      message: "Restore drill refused: live restore database identity matches primary staging database",
    };
  }

  if (
    postgresEndpointsEqual(
      { ...primaryEp.endpoint, database: primaryLive },
      { ...restoreEp.endpoint, database: restoreLive },
    )
  ) {
    return {
      code: "restore_endpoint_equals_primary",
      message: "Restore drill refused: restore endpoint matches primary host, port, and database",
    };
  }

  return null;
}
