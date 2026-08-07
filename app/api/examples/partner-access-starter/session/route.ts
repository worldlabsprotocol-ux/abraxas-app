// FILE: app/api/examples/partner-access-starter/session/route.ts
// Server-side receipt verification + signed HttpOnly session cookie.

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  STARTER_BASE_PATH,
  STARTER_LABEL,
} from "@/examples/partner-access-nextjs-starter/lib/constants";
import {
  assessStarterRuntime,
  starterDisabledApiResponse,
} from "@/examples/partner-access-nextjs-starter/lib/runtimeGate";
import {
  signStarterSession,
  STARTER_SESSION_COOKIE,
} from "@/examples/partner-access-nextjs-starter/lib/session";
import {
  publicAccessSummary,
  verifyReceiptServerSide,
} from "@/examples/partner-access-nextjs-starter/lib/verifyReceipt";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const runtime = assessStarterRuntime();
  if (!runtime.enabled) {
    return starterDisabledApiResponse();
  }

  if (!runtime.ready || !runtime.config.config || !runtime.config.sessionSecret) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404 },
    );
  }

  const resolved = runtime.config;

  let body: { receipt_id?: string };
  try {
    body = (await req.json()) as { receipt_id?: string };
  } catch {
    return NextResponse.json(
      { demo_label: STARTER_LABEL, code: "invalid_body", message: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const receiptId = body.receipt_id?.trim();
  if (!receiptId) {
    return NextResponse.json(
      { demo_label: STARTER_LABEL, code: "receipt_id_missing", message: "receipt_id is required." },
      { status: 400 },
    );
  }

  const verification = await verifyReceiptServerSide({
    receiptId,
    config: resolved.config!,
    allowSandbox: resolved.allowSandbox,
  });

  if (!verification.ok || !verification.receipt) {
    return NextResponse.json(
      {
        demo_label: STARTER_LABEL,
        code: "receipt_verification_failed",
        message: "Receipt verification failed.",
        errors: verification.errors,
      },
      { status: 403 },
    );
  }

  const expiresAt = verification.receipt.expires_at;
  if (!expiresAt) {
    return NextResponse.json(
      { demo_label: STARTER_LABEL, code: "receipt_expires_at_missing", message: "Receipt missing expiry." },
      { status: 403 },
    );
  }

  const token = signStarterSession(
    {
      receiptId,
      partnerId: resolved.config!.partnerId,
      policyId: resolved.config!.policyId,
      expiresAt,
    },
    resolved.sessionSecret!,
  );

  const response = NextResponse.json({
    demo_label: STARTER_LABEL,
    code: "access_granted",
    summary: publicAccessSummary(verification.receipt),
  });

  response.cookies.set(STARTER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: STARTER_BASE_PATH,
    expires: new Date(expiresAt),
  });

  return response;
}

export async function GET(_req: NextRequest) {
  const runtime = assessStarterRuntime();
  if (!runtime.enabled) {
    return starterDisabledApiResponse();
  }

  if (!runtime.ready || !runtime.config.sessionSecret) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404 },
    );
  }

  const cookieStore = cookies();
  const token = cookieStore.get(STARTER_SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json(
      { demo_label: STARTER_LABEL, code: "no_session", authenticated: false },
      { status: 401 },
    );
  }

  const { verifyStarterSession, isStarterSessionActive } = await import(
    "@/examples/partner-access-nextjs-starter/lib/session"
  );
  const session = verifyStarterSession(token, runtime.config.sessionSecret);
  if (!session || !isStarterSessionActive(session)) {
    return NextResponse.json(
      { demo_label: STARTER_LABEL, code: "session_expired", authenticated: false },
      { status: 401 },
    );
  }

  return NextResponse.json({
    demo_label: STARTER_LABEL,
    authenticated: true,
    partner_id: session.partnerId,
    policy_id: session.policyId,
    receipt_id: session.receiptId,
    expires_at: session.expiresAt,
  });
}
