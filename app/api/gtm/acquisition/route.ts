// FILE: app/api/gtm/acquisition/route.ts
// Privacy-safe GTM acquisition events — sanitized categories only.

import { NextResponse } from "next/server";
import {
  buildSanitizedAcquisitionEvent,
  isGtmAcquisitionEventType,
} from "@/lib/gtm/acquisitionEvents";
import { recordGtmAcquisitionEvent } from "@/lib/gtm/acquisitionStore";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const eventType = record.event_type;
  if (typeof eventType !== "string" || !isGtmAcquisitionEventType(eventType)) {
    return NextResponse.json({ ok: false, error: "invalid_event_type" }, { status: 400 });
  }

  const attributes =
    record.attributes && typeof record.attributes === "object"
      ? (record.attributes as Record<string, unknown>)
      : undefined;

  const sanitized = buildSanitizedAcquisitionEvent({
    event_type: eventType,
    attributes,
  });

  recordGtmAcquisitionEvent(sanitized);

  return NextResponse.json({ ok: true, event_type: sanitized.event_type });
}
