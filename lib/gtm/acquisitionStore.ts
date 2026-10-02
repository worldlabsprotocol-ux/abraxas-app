// FILE: lib/gtm/acquisitionStore.ts
// In-memory GTM acquisition event store for tests and lightweight telemetry.

import type { SanitizedGtmAcquisitionEvent } from "./acquisitionEvents";

const events: SanitizedGtmAcquisitionEvent[] = [];

export function recordGtmAcquisitionEvent(event: SanitizedGtmAcquisitionEvent): void {
  events.push(event);
  if (events.length > 500) events.shift();
}

export function listGtmAcquisitionEventsForTests(): SanitizedGtmAcquisitionEvent[] {
  return [...events];
}

export function resetGtmAcquisitionEventsForTests(): void {
  events.length = 0;
}
