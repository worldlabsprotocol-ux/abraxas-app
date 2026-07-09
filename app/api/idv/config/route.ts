// FILE: app/api/idv/config/route.ts
// Public IDV mode — lets Passport UI choose Veriff vs manual pilot review.

import { NextResponse } from "next/server";
import { getIdvProvider, idvProviderLabel, isVeriffLive } from "@/lib/idv/idvProvider";

export async function GET() {
  const provider = getIdvProvider();
  return NextResponse.json({
    idv_provider: provider,
    veriff_live: isVeriffLive(),
    label: idvProviderLabel(provider),
    manual_review: provider === "manual",
  });
}
