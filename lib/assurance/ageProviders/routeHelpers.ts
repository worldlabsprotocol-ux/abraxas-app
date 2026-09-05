// FILE: lib/assurance/ageProviders/routeHelpers.ts
// Shared helpers for age-assurance API routes.

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { isAllowedPartnerReturnUrl } from "@/lib/partner/returnUrlAllowlist";
import { getPolicy } from "@/lib/verification/requestsService";
import type { AgeThreshold } from "./types";

export async function requireAgeAssuranceSession(req: NextRequest) {
  return requireBrowserSession(req);
}

export function ageAssuranceErrorResponse(
  code: string,
  error: string,
  status: number,
): NextResponse {
  return NextResponse.json({ ok: false, code, error }, { status });
}

export async function validateAgeAssurancePartnerContext(input: {
  partnerId: string;
  policyId: string;
  returnUrl?: string;
}): Promise<{ ok: true; threshold: AgeThreshold } | { ok: false; code: string; error: string }> {
  const policy = await getPolicy(input.policyId);
  if (!policy) {
    return { ok: false, code: "policy_not_found", error: "Policy not found" };
  }
  if (policy.partner_id !== input.partnerId) {
    return { ok: false, code: "partner_policy_mismatch", error: "Policy does not belong to partner" };
  }

  if (input.returnUrl) {
    const allowed = await isAllowedPartnerReturnUrl(input.partnerId, input.returnUrl);
    if (!allowed) {
      return { ok: false, code: "return_url_not_allowed", error: "return_url not allowlisted" };
    }
  }

  const minimumAge = (policy.rules_json as { minimum_age?: number }).minimum_age ?? 21;
  const threshold: AgeThreshold = minimumAge >= 21 ? 21 : 18;
  return { ok: true, threshold };
}

export function parseRequestedThreshold(raw: unknown, fallback: AgeThreshold): AgeThreshold {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (n === 18 || n === 21) return n;
  return fallback;
}
