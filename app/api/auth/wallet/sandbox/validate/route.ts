// FILE: app/api/auth/wallet/sandbox/validate/route.ts
// Independent verification of ephemeral sandbox test results (no wallet session required).

import { NextRequest, NextResponse } from "next/server";
import {
  loadEphemeralSandboxTestResult,
} from "@/lib/auth/ephemeralWallet/sandboxTestVerification";
import {
  buildSandboxReceiptValidationPayload,
  isPresentedSandboxTestReceipt,
} from "@/lib/auth/ephemeralWallet/sandboxReceiptValidationResponse";
import { rejectUnknownJsonKeys } from "@/lib/http/strictJsonBody";
import { SANDBOX_RECEIPT_VALIDATE_BODY_KEYS } from "@/lib/auth/ephemeralWallet/sandboxValidateClientRequest";

export const dynamic = "force-dynamic";

function jsonValidation(
  payload: Awaited<ReturnType<typeof buildSandboxReceiptValidationPayload>>,
  status = 200,
) {
  return NextResponse.json(payload, { status });
}

export async function GET(req: NextRequest) {
  const receiptId = req.nextUrl.searchParams.get("receipt_id")?.trim() ?? "";
  if (!receiptId) {
    return NextResponse.json({ ok: false, code: "invalid_input" }, { status: 400 });
  }

  const stored = await loadEphemeralSandboxTestResult(receiptId);
  if (!stored) {
    return NextResponse.json({ ok: false, code: "result_not_found" }, { status: 404 });
  }

  return jsonValidation(
    await buildSandboxReceiptValidationPayload({ receipt: stored, source: "server_cache" }),
  );
}

/** Independent validation from a client-held sandbox receipt (no session). */
export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: "invalid_input" }, { status: 400 });
  }
  const parsedBody = rejectUnknownJsonKeys(raw, SANDBOX_RECEIPT_VALIDATE_BODY_KEYS);
  if (!parsedBody.ok) {
    return NextResponse.json({ ok: false, code: parsedBody.code }, { status: 400 });
  }

  if (!isPresentedSandboxTestReceipt(parsedBody.body.receipt)) {
    return NextResponse.json({ ok: false, code: "invalid_receipt" }, { status: 400 });
  }

  const payload = await buildSandboxReceiptValidationPayload({
    receipt: parsedBody.body.receipt,
    source: "presented_receipt",
  });
  return jsonValidation(payload);
}
