// FILE: app/api/auth/wallet/sandbox/validate/route.ts
// Independent verification of ephemeral sandbox test results (no session required).

import { NextRequest, NextResponse } from "next/server";
import {
  EPHEMERAL_SANDBOX_RESULT_LABEL,
  loadEphemeralSandboxTestResult,
  validateEphemeralSandboxTestResult,
} from "@/lib/auth/ephemeralWallet/sandboxTestVerification";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const receiptId = req.nextUrl.searchParams.get("receipt_id")?.trim() ?? "";
  if (!receiptId) {
    return NextResponse.json({ ok: false, code: "invalid_input" }, { status: 400 });
  }

  const stored = await loadEphemeralSandboxTestResult(receiptId);
  const receipt = stored ?? null;
  if (!receipt) {
    return NextResponse.json({ ok: false, code: "result_not_found" }, { status: 404 });
  }

  const validation = validateEphemeralSandboxTestResult(receipt);
  return NextResponse.json({
    ok: validation.ok,
    result_label: EPHEMERAL_SANDBOX_RESULT_LABEL,
    test_only: true,
    production_usable: false,
    signature_valid: validation.trust.signature_valid,
    currently_valid: validation.trust.currently_valid,
    invalidation_reasons: validation.trust.invalidation_reasons,
    receipt,
  });
}
