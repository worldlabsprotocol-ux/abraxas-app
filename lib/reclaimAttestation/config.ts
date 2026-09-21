// FILE: lib/reclaimAttestation/config.ts
// Fail closed when Reclaim credentials, runtime origin, or HMAC secret are missing.
// Callback origin is server-derived. Browser, partner, and request parameters cannot choose it.

import { SITE_URL } from "@/lib/siteUrl";
import { PUBLIC_DEMO_ORIGIN } from "@/lib/product/publicOrigin";
import { isPublicDemoRuntime } from "@/lib/product/demoRuntime";
import { RECLAIM_CALLBACK_PATH } from "./contract";
import { RECLAIM_PROVIDER_MAPPINGS } from "./mapping";

export type ReclaimRuntimeClass = "demo" | "production";

export type ReclaimRuntimeResolved = {
  runtime: ReclaimRuntimeClass;
  origin: string;
  callbackUrl: string;
};

export type ReclaimRuntimeResult =
  | { ok: true } & ReclaimRuntimeResolved
  | { ok: false; code: "reclaim_origin_unknown" | "reclaim_origin_mismatch" };

function configuredAppOrigin(env: Record<string, string | undefined>): string | null {
  const raw = (env.NEXT_PUBLIC_APP_URL ?? env.ABRAXAS_ISSUER_URL)?.trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw.includes("://") ? raw : `https://${raw}`);
    if (parsed.protocol !== "https:") return null;
    return `${parsed.protocol}//${parsed.hostname.toLowerCase()}`;
  } catch {
    return null;
  }
}

function runtimeClass(env: Record<string, string | undefined>): ReclaimRuntimeClass | null {
  const named = env.ABRAXAS_RUNTIME_ENV?.trim();
  if (named === "demo" || isPublicDemoRuntime(env)) return "demo";
  if (named === "production") return "production";
  if (named) return null;
  if (env.VERCEL_ENV === "production" && !isPublicDemoRuntime(env)) return "production";
  return null;
}

function expectedOrigin(runtime: ReclaimRuntimeClass): string {
  return runtime === "demo" ? PUBLIC_DEMO_ORIGIN : SITE_URL.replace(/\/$/, "");
}

export function resolveReclaimRuntime(
  env: Record<string, string | undefined> = process.env,
): ReclaimRuntimeResult {
  const runtime = runtimeClass(env);
  if (!runtime) return { ok: false, code: "reclaim_origin_unknown" };
  const origin = expectedOrigin(runtime);
  const configured = configuredAppOrigin(env);
  if (!configured || configured !== origin) {
    return { ok: false, code: "reclaim_origin_mismatch" };
  }
  return {
    ok: true,
    runtime,
    origin,
    callbackUrl: `${origin}${RECLAIM_CALLBACK_PATH}`,
  };
}

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

export function reclaimCallbackUrl(): string | null {
  const resolved = resolveReclaimRuntime();
  return resolved.ok ? resolved.callbackUrl : null;
}

export function reclaimCallbackAllowlisted(url: string | null | undefined): boolean {
  const expected = reclaimCallbackUrl();
  if (!expected || !url) return false;
  try {
    const parsed = new URL(url);
    const allow = new URL(expected);
    return parsed.origin === allow.origin
      && parsed.pathname === allow.pathname
      && parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function reclaimRequestMatchesRuntime(request: { headers: Headers }): boolean {
  const resolved = resolveReclaimRuntime();
  if (!resolved.ok) return false;
  const forwarded = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const hostHeader = request.headers.get("host")?.split(",")[0]?.trim();
  const host = (forwarded || hostHeader || "").toLowerCase().replace(/:\d+$/, "");
  if (!host) return false;
  try {
    return host === new URL(resolved.origin).hostname;
  } catch {
    return false;
  }
}

export function reclaimConfigurationPresent(): boolean {
  return Boolean(reclaimAppId() && reclaimAppSecret() && reclaimHmacSecret() && resolveReclaimRuntime().ok);
}

export function reclaimMappingPresent(): boolean {
  return RECLAIM_PROVIDER_MAPPINGS.length > 0;
}

export function reclaimIsIntegrationReady(): boolean {
  const callback = reclaimCallbackUrl();
  return reclaimConfigurationPresent() && reclaimMappingPresent() && reclaimCallbackAllowlisted(callback);
}
