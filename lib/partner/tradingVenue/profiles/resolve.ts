// FILE: lib/partner/tradingVenue/profiles/resolve.ts
// Resolve venue profiles on the server. Client input never becomes authority.

import type { VenueIntegrationProfile, VenueProfileSafeReason } from "./contract";
import { VENUE_PROFILE_CLIENT_OVERRIDE_KEYS } from "./contract";
import { getVenueProfile } from "./registry";

export function rejectVenueProfileClientOverride(body: unknown): boolean {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  const keys = Object.keys(body as Record<string, unknown>);
  return keys.some((key) => (VENUE_PROFILE_CLIENT_OVERRIDE_KEYS as readonly string[]).includes(key));
}

export function resolveVenueProfile(input: {
  configuredProfileId?: string | null;
  kitEnvironment: "sandbox" | "production";
}): { ok: true; profile: VenueIntegrationProfile } | { ok: false; reason: VenueProfileSafeReason | "environment_mismatch" } {
  const profileId = input.configuredProfileId?.trim() || "generic_trading_venue";
  const profile = getVenueProfile(profileId);
  if (!profile) return { ok: false, reason: "profile_unknown" };
  if (profile.posture === "disabled") return { ok: false, reason: "profile_disabled" };
  if (profile.posture === "planned") return { ok: false, reason: "profile_planned" };
  if (profile.posture === "sandbox_preflight" && input.kitEnvironment === "production") {
    return { ok: false, reason: "environment_mismatch" };
  }
  if (profile.posture === "production_review_required") {
    return { ok: false, reason: "profile_mismatch" };
  }
  return { ok: true, profile };
}
