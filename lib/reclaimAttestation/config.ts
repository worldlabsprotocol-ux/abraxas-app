// FILE: lib/reclaimAttestation/config.ts
// Fail closed when Reclaim app credentials, callback, or HMAC secret are missing.

import { SITE_URL } from "@/lib/siteUrl";
import { RECLAIM_CALLBACK_PATH } from "./contract";
import { RECLAIM_PROVIDER_MAPPINGS } from "./mapping";

export function reclaimAppId(): string | null {
  const value = process.env.RECLAIMPROTOCOL_APP_ID?.trim();
  return value ? value : null;
}

export function reclaimAppSecret(): string | null {
  const value = process.env.RECLAIMPROTOCOL_APP_SECRET?.trim();
  return value ? value : null;
}

export function reclaimHmacSecret(): string | null {
  const value = (process.env.ABRAXAS_SIGNING_KEY ?? process.env.NEXTAUTH_SECRET)?.trim();
  return value ? value : null;
}

export function reclaimCallbackUrl(): string {
  return `${SITE_URL.replace(/\/$/, "")}${RECLAIM_CALLBACK_PATH}`;
}

export function reclaimCallbackAllowlisted(url: string): boolean {
  try {
    const parsed = new URL(url);
    const expected = new URL(reclaimCallbackUrl());
    return parsed.origin === expected.origin
      && parsed.pathname === expected.pathname
      && parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function reclaimConfigurationPresent(): boolean {
  return Boolean(reclaimAppId() && reclaimAppSecret() && reclaimHmacSecret());
}

export function reclaimMappingPresent(): boolean {
  return RECLAIM_PROVIDER_MAPPINGS.length > 0;
}

export function reclaimIsIntegrationReady(): boolean {
  return reclaimConfigurationPresent() && reclaimMappingPresent() && reclaimCallbackAllowlisted(reclaimCallbackUrl());
}
