// FILE: app/api/admin/cielo/calendar/route.ts
// Operator calendar management (block/unblock dates on Abraxas Protocol Calendar).

import { NextRequest, NextResponse } from "next/server";
import {
  addOperatorBlock,
  listCalendarBlocks,
  removeBlockById,
} from "@/lib/cielo/calendar";

const ADMIN_PIN = process.env.ADMIN_PIN ?? process.env.NEXT_PUBLIC_ADMIN_PIN ?? "abraxas2026";

function authorized(req: NextRequest, body?: { pin?: string }) {
  const headerPin = req.headers.get("x-admin-pin");
  const pin = headerPin ?? body?.pin;
  return pin === ADMIN_PIN;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const blocks = await listCalendarBlocks();
  return NextResponse.json({ blocks });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (!authorized(req, body)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = String(body.start_date ?? "");
  const end = String(body.end_date ?? "");
  const note = String(body.note ?? "Operator block");

  if (!start || !end) {
    return NextResponse.json({ error: "start_date and end_date required" }, { status: 400 });
  }

  await addOperatorBlock(start, end, note, "admin");
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (!authorized(req, body)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await removeBlockById(id);
  return NextResponse.json({ ok: true });
}
