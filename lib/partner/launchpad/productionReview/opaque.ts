// FILE: lib/partner/launchpad/productionReview/opaque.ts
// Opaque request references. Never echo raw database errors or secrets.

import { createHash } from "node:crypto";

export function opaqueProductionRequestRef(requestId: string): string {
  return `prq_${createHash("sha256").update(`production-review:${requestId}`).digest("hex").slice(0, 12)}`;
}

export function sanitizeReviewNote(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const note = raw.trim();
  if (!note) return null;
  if (note.length > 280) return null;
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(note)) return null;
  if (/abx_(test|live|whsec)_/i.test(note)) return null;
  if (/receipt[_-]?id|wallet|0x[a-f0-9]{20,}|https?:\/\//i.test(note)) return null;
  return note;
}
