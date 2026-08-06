// FILE: app/api/auth/zklogin/config/route.ts
// Server-aligned zkLogin configuration for client UI (no secrets or client IDs).

import { NextResponse } from "next/server";
import { describeZkLoginAudienceConfiguration } from "@/lib/sui/zklogin/audienceCohorts";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = describeZkLoginAudienceConfiguration();

  return NextResponse.json({
    canonical_server_configured: config.canonicalServerConfigured,
    legacy_server_configured: config.legacyServerConfigured,
    legacy_recovery_available: config.legacyRecoveryAvailable,
    trusted_audience_count: config.trustedAudienceCount,
  });
}
