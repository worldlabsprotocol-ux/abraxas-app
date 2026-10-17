// FILE: app/api/auth/native/enabled/route.ts

import { NextResponse } from "next/server";
import { isNativeAccountAuthEnabled } from "@/lib/auth/nativeAccount/featureFlag";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    enabled: isNativeAccountAuthEnabled(),
  });
}
