// FILE: app/api/auth/native/enabled/route.ts

import { NextResponse } from "next/server";
import { isNativeAccountAuthEnabled } from "@/lib/auth/nativeAccount/featureFlag";
import { getNativeAuthRuntimeDiagnostics } from "@/lib/auth/nativeAccount/runtimeDiagnostics";

export const dynamic = "force-dynamic";

export async function GET() {
  const diagnostics = getNativeAuthRuntimeDiagnostics();
  return NextResponse.json({
    ok: true,
    enabled: isNativeAccountAuthEnabled(),
    runtime: diagnostics,
  });
}
