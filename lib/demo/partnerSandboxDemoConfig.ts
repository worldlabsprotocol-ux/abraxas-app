// FILE: lib/demo/partnerSandboxDemoConfig.ts
// Server-only feature gate and pre-provisioned sandbox demo subject.

import { normalizeSuiAddress } from "@mysten/sui/utils";

export const PARTNER_SANDBOX_DEMO_FLAG_ENV = "PARTNER_SANDBOX_DEMO_ENABLED";
export const PARTNER_SANDBOX_DEMO_SUBJECT_ENV = "PARTNER_SANDBOX_DEMO_SUBJECT_ID";

export function isPartnerSandboxDemoEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env[PARTNER_SANDBOX_DEMO_FLAG_ENV]?.trim() === "true";
}

export function resolvePartnerSandboxDemoSubjectId(
  env: Record<string, string | undefined> = process.env,
): { ok: true; subjectId: string } | { ok: false; error: string } {
  if (!isPartnerSandboxDemoEnabled(env)) {
    return { ok: false, error: "partner_sandbox_demo_disabled" };
  }

  const raw = env[PARTNER_SANDBOX_DEMO_SUBJECT_ENV]?.trim();
  if (!raw) {
    return { ok: false, error: "partner_sandbox_demo_subject_not_configured" };
  }

  try {
    return { ok: true, subjectId: normalizeSuiAddress(raw) };
  } catch {
    return { ok: false, error: "partner_sandbox_demo_subject_invalid" };
  }
}
