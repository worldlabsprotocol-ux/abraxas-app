// FILE: app/api/developers/verification-first/synthetic-bundle/route.ts
// Read-only synthetic portable bundle for offline @abraxas/independent-verifier onboarding.

import { NextResponse } from "next/server";
import { verificationFirstSyntheticPortableBundle } from "@/lib/partner/portableIndependentVerification/integrationFirstDemonstration";

export const dynamic = "force-static";

export async function GET() {
  const bundle = verificationFirstSyntheticPortableBundle();
  return NextResponse.json(
    {
      ok: true,
      label: "synthetic_teaching_fixture",
      not_for_production: true,
      npm_package: "@abraxas/independent-verifier",
      bundle,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600",
        "Content-Disposition":
          'attachment; filename="abraxas-synthetic-verification-bundle.json"',
      },
    },
  );
}