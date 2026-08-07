// FILE: examples/partner-access-nextjs-starter/lib/runtimeGate.ts
// Strict runtime isolation — starter is opt-in only; never activated by Abraxas production env.

import { NextResponse } from "next/server";
import { resolveStarterConfig, type StarterConfigResult } from "./config";

export const STARTER_RUNTIME_ENV = {
  enabled: "PARTNER_ACCESS_STARTER_ENABLED",
} as const;

export interface StarterRuntimeAssessment {
  /** Explicit server-only opt-in (PARTNER_ACCESS_STARTER_ENABLED=true). */
  enabled: boolean;
  /** Opt-in plus complete, valid starter configuration. */
  ready: boolean;
  config: StarterConfigResult;
}

export function isStarterRuntimeEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env[STARTER_RUNTIME_ENV.enabled]?.trim() === "true";
}

export function assessStarterRuntime(
  env: Record<string, string | undefined> = process.env,
): StarterRuntimeAssessment {
  const enabled = isStarterRuntimeEnabled(env);
  const config = resolveStarterConfig(env);
  const ready = enabled
    && config.config !== null
    && config.missing.length === 0
    && config.returnUrlErrors.length === 0
    && Boolean(config.sessionSecret);

  return { enabled, ready, config };
}

/** Generic API 404 — no env hints, no receipt/cookie work. */
export function starterDisabledApiResponse(): NextResponse {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export function assertStarterRuntimeEnabled(
  env: Record<string, string | undefined> = process.env,
): StarterRuntimeAssessment | null {
  if (!isStarterRuntimeEnabled(env)) {
    return null;
  }
  return assessStarterRuntime(env);
}
