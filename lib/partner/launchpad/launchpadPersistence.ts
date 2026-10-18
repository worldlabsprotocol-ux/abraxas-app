// FILE: lib/partner/launchpad/launchpadPersistence.ts

import { isSovereignNativeAccountMode } from "@/lib/persistence/sovereignNativeAccount";
import { isNativeAccountDirectPostgresEnabled } from "@/lib/persistence/nativeAccountPg";

export function launchpadUsesSovereignPostgres(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return isSovereignNativeAccountMode(env) && isNativeAccountDirectPostgresEnabled(env);
}
