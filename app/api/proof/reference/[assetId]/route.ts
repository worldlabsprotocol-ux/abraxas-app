// FILE: app/api/proof/reference/[assetId]/route.ts
// Production reference proof — Cielo Sunrise or Chickasaw registry verification.

import { NextRequest, NextResponse } from "next/server";
import { issueProductionReferenceProof } from "@/lib/authenticationProof/productionReference";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { assetId: string } },
) {
  const result = await issueProductionReferenceProof(params.assetId);

  if ("error" in result && result.error === "not_allowed") {
    return NextResponse.json(
      {
        error: "Only production reference assets are supported",
        allowed: ["ABX-RE-HOSP-001", "ABX-RE-LAND-006"],
      },
      { status: 400 },
    );
  }

  return NextResponse.json(result);
}
