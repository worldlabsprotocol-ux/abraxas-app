// FILE: app/api/auth/zklogin/config/route.ts
// Server-aligned zkLogin configuration for client UI (no secrets or client IDs).

import { NextResponse } from "next/server";
import { describeZkLoginAudienceConfiguration } from "@/lib/sui/zklogin/audienceCohorts";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = describeZkLoginAudienceConfiguration();

  return NextResponse.json({
    canonical_configured: config.canonicalConfigured,
    legacy_recovery_available: config.legacyRecoveryAvailable,
    trusted_audience_count: config.trustedAudienceCount,
    uses_public_canonical_fallback: config.usesPublicCanonicalFallback,
    uses_public_legacy_fallback: config.usesPublicLegacyFallback,
  });
}
