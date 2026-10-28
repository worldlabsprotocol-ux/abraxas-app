// FILE: lib/partner/starterKit/prepareLaunchpadStarterKitBody.ts
// Launchpad route accepts binding_id; validation accepts only generator fields.

import { STARTER_KIT_ALLOWED_INPUT_KEYS } from "./contract";

export function prepareLaunchpadStarterKitBody(
  raw: Record<string, unknown>,
  packId: string,
): Record<string, unknown> {
  const allowed = new Set<string>(STARTER_KIT_ALLOWED_INPUT_KEYS);
  const body: Record<string, unknown> = { pack_id: packId };
  for (const key of STARTER_KIT_ALLOWED_INPUT_KEYS) {
    if (key === "pack_id") continue;
    if (key in raw) body[key] = raw[key];
  }
  for (const key of Object.keys(raw)) {
    if (key === "binding_id") continue;
    if (!allowed.has(key)) {
      throw new Error(`unexpected_starter_kit_field:${key}`);
    }
  }
  return body;
}
