// FILE: lib/gtm/clientTelemetry.ts
// Best-effort browser GTM event recording — never blocks UI.

import type { GtmAcquisitionEventAttributes, GtmAcquisitionEventType } from "./contract";
import { buildSanitizedAcquisitionEvent } from "./acquisitionEvents";

export async function recordGtmClientEvent(
  eventType: GtmAcquisitionEventType,
  attributes?: GtmAcquisitionEventAttributes,
): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    buildSanitizedAcquisitionEvent({
      event_type: eventType,
      attributes: attributes as Record<string, unknown> | undefined,
    });
  } catch {
    return;
  }
  try {
    await fetch("/api/gtm/acquisition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ event_type: eventType, attributes }),
      keepalive: true,
    });
  } catch {
    // best-effort only
  }
}
