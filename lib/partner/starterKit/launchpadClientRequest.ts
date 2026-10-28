// FILE: lib/partner/starterKit/launchpadClientRequest.ts
// Canonical Launchpad starter-kit POST body (client + contract tests).

import { STARTER_KIT_ALLOWED_INPUT_KEYS } from "./contract";

/** Keys the browser may send; server resolves pack_id from binding_id. */
export const LAUNCHPAD_STARTER_KIT_CLIENT_BODY_KEYS = [
  "binding_id",
  "path",
  "platform",
  "capabilities",
  "runtime",
  "venue_profile_id",
] as const;

export type LaunchpadStarterKitClientBody = {
  binding_id?: string;
  path: string;
  platform: string;
  capabilities?: unknown[];
  runtime?: string;
  venue_profile_id?: string;
};

export function buildLaunchpadStarterKitRequestBody(input: {
  bindingId: string | null;
  path: string;
  platform: string;
  capabilities?: unknown[];
}): LaunchpadStarterKitClientBody {
  return {
    binding_id: input.bindingId ?? "",
    path: input.path,
    platform: input.platform,
    capabilities: input.capabilities ?? [],
  };
}

/** Documented extension keys stripped before strict generator validation. */
export const LAUNCHPAD_STARTER_KIT_SERVER_EXTENSION_KEYS = ["binding_id"] as const;

export function launchpadStarterKitClientKeysAreDocumented(): boolean {
  const generatorKeys = new Set<string>(STARTER_KIT_ALLOWED_INPUT_KEYS);
  for (const key of LAUNCHPAD_STARTER_KIT_CLIENT_BODY_KEYS) {
    if (key === "binding_id") continue;
    if (!generatorKeys.has(key)) return false;
  }
  return true;
}
