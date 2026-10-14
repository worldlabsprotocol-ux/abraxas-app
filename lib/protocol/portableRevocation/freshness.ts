// FILE: lib/protocol/portableRevocation/freshness.ts

import type { PortableRevocationPayload } from "./contract";
import type { PortableRevocationVerifyCode } from "./verify";

export const PORTABLE_REVOCATION_DEFAULT_CLOCK_SKEW_SECONDS = 300;
export const PORTABLE_REVOCATION_MAX_FRESHNESS_SECONDS = 604_800;
export const PORTABLE_REVOCATION_MAX_STATUS_ENTRY_AGE_CAP_SECONDS = 604_800;

function parseInstant(iso: string): number | null {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

export function validatePortableRevocationFreshness(input: {
  payload: PortableRevocationPayload;
  now: Date;
  clockSkewSeconds?: number;
}): PortableRevocationVerifyCode[] {
  const codes: PortableRevocationVerifyCode[] = [];
  const skewMs = (input.clockSkewSeconds ?? PORTABLE_REVOCATION_DEFAULT_CLOCK_SKEW_SECONDS) * 1000;
  const nowMs = input.now.getTime();
  const { payload } = input;

  const issuedMs = parseInstant(payload.issued_at);
  const expiresMs = parseInstant(payload.expires_at);
  if (issuedMs === null || expiresMs === null) {
    codes.push("invalid_timestamp");
    return codes;
  }
  if (expiresMs <= issuedMs) {
    codes.push("invalid_expiry_window");
  }
  if (nowMs >= expiresMs) {
    codes.push("snapshot_expired");
  }
  if (issuedMs > nowMs + skewMs) {
    codes.push("snapshot_future_dated");
  }

  if (
    !Number.isInteger(payload.snapshot_sequence)
    || payload.snapshot_sequence < 1
  ) {
    codes.push("invalid_sequence");
  }

  if (
    !Number.isFinite(payload.max_freshness_seconds)
    || payload.max_freshness_seconds <= 0
    || payload.max_freshness_seconds > PORTABLE_REVOCATION_MAX_FRESHNESS_SECONDS
  ) {
    codes.push("invalid_freshness_bounds");
  } else {
    const ageSec = (nowMs - issuedMs) / 1000;
    if (ageSec > payload.max_freshness_seconds) {
      codes.push("snapshot_stale");
    }
  }

  if (
    !Number.isFinite(payload.max_status_entry_age_seconds)
    || payload.max_status_entry_age_seconds <= 0
    || payload.max_status_entry_age_seconds > PORTABLE_REVOCATION_MAX_STATUS_ENTRY_AGE_CAP_SECONDS
  ) {
    codes.push("invalid_freshness_bounds");
  }

  const seen = new Set<string>();
  for (const entry of payload.status_entries) {
    if (seen.has(entry.status_id)) {
      codes.push("duplicate_status_entry");
      break;
    }
    seen.add(entry.status_id);
    const updatedMs = parseInstant(entry.updated_at);
    if (updatedMs === null) {
      codes.push("invalid_timestamp");
      continue;
    }
    if (updatedMs > nowMs + skewMs) {
      codes.push("status_entry_future_dated");
    }
    if (updatedMs < issuedMs) {
      codes.push("invalid_status_entry");
    }
    const entryAgeSec = (nowMs - updatedMs) / 1000;
    if (entryAgeSec > payload.max_status_entry_age_seconds) {
      codes.push("stale_status_entry");
    }
  }

  return codes;
}
