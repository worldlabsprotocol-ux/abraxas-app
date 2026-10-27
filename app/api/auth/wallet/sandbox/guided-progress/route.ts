// FILE: app/api/auth/wallet/sandbox/guided-progress/route.ts
// Persist receipt validation outcomes for guided workspace refresh (session-bound).

import { NextRequest, NextResponse } from "next/server";
import { mapEphemeralStoreError } from "@/lib/auth/ephemeralWallet/apiGate";
import { getEphemeralSandboxForSession } from "@/lib/auth/ephemeralWallet/sandboxWorkspace";
import {
  updateEphemeralSandboxGuidedReceiptValidation,
  type EphemeralSandboxGuidedReceiptValidation,
} from "@/lib/auth/ephemeralWallet/sandboxWorkspaceGuidedProgress";
import { requireEphemeralWalletScope } from "@/lib/auth/ephemeralWallet/walletSession";

export const dynamic = "force-dynamic";

function parseValidation(body: unknown): EphemeralSandboxGuidedReceiptValidation | null {
  if (!body || typeof body !== "object") return null;
  const row = body as Record<string, unknown>;
  const status = row.status === "validated" || row.status === "failed" ? row.status : null;
  const checkedAt = typeof row.checked_at === "string" ? row.checked_at : null;
  if (!status || !checkedAt) return null;
  return {
    status,
    checked_at: checkedAt,
    signature_authentic: Boolean(row.signature_authentic),
    currently_acceptable: Boolean(row.currently_acceptable),
    invalidation_reasons: Array.isArray(row.invalidation_reasons)
      ? row.invalidation_reasons.map(String)
      : [],
    standalone_cryptographic_verification:
      typeof row.standalone_cryptographic_verification === "boolean"
        ? row.standalone_cryptographic_verification
        : undefined,
    verification_summary:
      typeof row.verification_summary === "string" ? row.verification_summary : null,
  };
}

export async function PATCH(req: NextRequest) {
  const auth = await requireEphemeralWalletScope(req, "wallet:session");
  if (!auth.ok) {
    return NextResponse.json({ ok: false, code: auth.error }, { status: auth.status });
  }

  let body: { receipt_id?: string; validation?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: "invalid_input" }, { status: 400 });
  }

  const receiptId = String(body.receipt_id ?? "").trim();
  const validation = parseValidation(body.validation);
  if (!receiptId || !validation) {
    return NextResponse.json({ ok: false, code: "invalid_input" }, { status: 400 });
  }

  try {
    const workspace = await getEphemeralSandboxForSession(auth.session.sessionId);
    if (!workspace) {
      return NextResponse.json({ ok: false, code: "sandbox_workspace_required" }, { status: 400 });
    }
    const outcome = await updateEphemeralSandboxGuidedReceiptValidation({
      sessionId: auth.session.sessionId,
      workspaceId: workspace.workspace_id,
      receiptId,
      validation,
    });
    if (!outcome.ok) {
      const status = outcome.code === "not_found" ? 404 : 409;
      return NextResponse.json({ ok: false, code: outcome.code }, { status });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const mapped = mapEphemeralStoreError(error);
    if (mapped) return mapped;
    throw error;
  }
}
