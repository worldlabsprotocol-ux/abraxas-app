// FILE: app/api/admin/cielo/verified-rate/route.ts
// Operator queue for Cielo verified-rate requests.

import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/adminAuth";
import {
  applyOperatorAction,
  getVerifiedRateRequestByRef,
  listVerifiedRateRequests,
  type OperatorAction,
} from "@/lib/cielo/verifiedRateOperator";
import { OPERATOR_STATUS_LABELS, type VerifiedRateOperatorStatus } from "@/lib/cielo/verifiedRateLabels";
import { evaluateCieloVerifiedGuest } from "@/lib/cielo/verifiedGuestPolicy";

export const dynamic = "force-dynamic";

const FILTER_STATUSES: VerifiedRateOperatorStatus[] = [
  "request_received",
  "pending_review",
  "eligible",
  "operator_confirmed",
  "declined",
];

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const statusParam = req.nextUrl.searchParams.get("status")?.trim();
  const ref = req.nextUrl.searchParams.get("ref")?.trim();

  try {
    if (ref) {
      const detail = await getVerifiedRateRequestByRef(ref);
      if (!detail) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const walletEval = await evaluateCieloVerifiedGuest(detail.subject_sui_address, {
        requireConsent: true,
      });

      return NextResponse.json({
        request: {
          ...detail,
          status_label: OPERATOR_STATUS_LABELS[detail.status as VerifiedRateOperatorStatus] ?? detail.status,
          wallet_binding_status: walletEval.wallet_binding_active
            ? walletEval.wallet_binding_fresh
              ? "active_fresh"
              : "active_stale"
            : "missing",
        },
      });
    }

    const status =
      statusParam && FILTER_STATUSES.includes(statusParam as VerifiedRateOperatorStatus)
        ? (statusParam as VerifiedRateOperatorStatus)
        : undefined;

    const all = await listVerifiedRateRequests({ limit: 500 });
    const requests = status ? all.filter(r => r.status === status) : all;
    const counts = Object.fromEntries(
      FILTER_STATUSES.map(s => [s, all.filter(r => r.status === s).length]),
    ) as Record<VerifiedRateOperatorStatus, number>;

    return NextResponse.json({
      requests: requests.map(r => ({
        ...r,
        status_label: OPERATOR_STATUS_LABELS[r.status as VerifiedRateOperatorStatus] ?? r.status,
      })),
      filters: FILTER_STATUSES.map(s => ({
        status: s,
        label: OPERATOR_STATUS_LABELS[s],
        count: counts[s] ?? 0,
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load requests" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    public_reference?: string;
    action?: OperatorAction;
    operator_id?: string;
    assigned_to?: string;
    internal_note?: string;
    decline_reason?: string;
  };

  if (!body.public_reference || !body.action) {
    return NextResponse.json({ error: "public_reference and action required" }, { status: 400 });
  }

  const allowed: OperatorAction[] = [
    "mark_under_review",
    "mark_eligible",
    "confirm_contact_sent",
    "decline",
  ];
  if (!allowed.includes(body.action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  try {
    const updated = await applyOperatorAction({
      publicReference: body.public_reference,
      action: body.action,
      operatorId: body.operator_id?.trim() || "cielo_operator",
      assignedTo: body.assigned_to,
      internalNote: body.internal_note,
      declineReason: body.decline_reason,
    });

    return NextResponse.json({
      ok: true,
      request: {
        ...updated,
        status_label: OPERATOR_STATUS_LABELS[updated.status as VerifiedRateOperatorStatus] ?? updated.status,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Update failed";
    const status = msg.includes("required") || msg.includes("Cannot transition") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
