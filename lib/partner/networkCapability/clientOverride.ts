// FILE: lib/partner/networkCapability/clientOverride.ts

import { rejectClientDisclosureConfig } from "@/lib/privacy/selectiveDisclosure";
import { NETWORK_CLIENT_OVERRIDE_KEYS } from "./types";

export function rejectNetworkClientOverride(body: unknown): boolean {
  if (!rejectClientDisclosureConfig(body).ok) return true;
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  const keys = Object.keys(body as Record<string, unknown>);
  return keys.some((key) => (NETWORK_CLIENT_OVERRIDE_KEYS as readonly string[]).includes(key));
}
