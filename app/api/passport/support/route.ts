// FILE: app/api/passport/support/route.ts
// Session-bound Passport support intake and privacy-minimized holder history.

import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { resolveAuthenticatedHolderSession } from "@/lib/passport/portableTrust/resolveHolderSession";
import { checkLaunchpadRateLimit } from "@/lib/partner/launchpad/rateLimit";
import { queryAbraxasPg } from "@/lib/persistence/pgPool";
import {
  isPassportSupportIssue,
  isPassportSupportStatus,
  normalizePassportSupportMessage,
  passportSupportIssueLabel,
  passportSupportStatusLabel,
} from "@/lib/passport/passportSupport";

export async function GET(req: NextRequest) {
  const auth = await resolveAuthenticatedHolderSession(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.error === "forbidden" ? 403 : 401 });
  }

  let rows: Array<{ reference: string; issue_type: string; status: string; created_at: string }>;
  try {
    const result = await queryAbraxasPg<(typeof rows)[number]>(
      `select reference, issue_type, status, created_at::text
       from public.passport_subject_support_requests
       where holder_subject_id = $1 order by created_at desc limit 10`,
      [auth.subjectId],
    );
    rows = result.rows;
  } catch {
    return NextResponse.json({ ok: false, error: "Support history is unavailable right now." }, { status: 503 });
  }

  const requests = rows.flatMap(row => {
    if (!isPassportSupportIssue(row.issue_type) || !isPassportSupportStatus(row.status)) return [];
    return [{
      reference: row.reference,
      issue_type: row.issue_type,
      issue_label: passportSupportIssueLabel(row.issue_type),
      status: row.status,
      status_label: passportSupportStatusLabel(row.status),
      submitted_at: row.created_at,
    }];
  });

  return NextResponse.json({ ok: true, requests });
}

export async function POST(req: NextRequest) {
  const auth = await resolveAuthenticatedHolderSession(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.error === "forbidden" ? 403 : 401 });
  }

  const rate = await checkLaunchpadRateLimit(req, "passport-support", 3, 60 * 60);
  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many support requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
    );
  }

  let body: { issue_type?: unknown; message?: unknown };
  try {
    body = await req.json() as { issue_type?: unknown; message?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  if (!isPassportSupportIssue(body.issue_type)) {
    return NextResponse.json({ ok: false, error: "Choose what you need help with." }, { status: 400 });
  }
  const message = normalizePassportSupportMessage(body.message);
  if (!message) {
    return NextResponse.json(
      { ok: false, error: "Add 10 to 2,000 characters describing what happened." },
      { status: 400 },
    );
  }

  const reference = `PS-${randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
  try {
    await queryAbraxasPg(
      `insert into public.passport_subject_support_requests
       (id, holder_subject_id, reference, issue_type, status, message)
       values ($1, $2, $3, $4, 'received', $5)`,
      [`ps_${randomUUID().replace(/-/g, "")}`, auth.subjectId, reference, body.issue_type, message],
    );
  } catch {
    return NextResponse.json({ ok: false, error: "We could not save your request. Try again." }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    reference,
    message: "Your request is saved in the Abraxas support queue.",
  });
}
