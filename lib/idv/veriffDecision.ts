// FILE: lib/idv/veriffDecision.ts
// Parse Veriff decision API / webhook payloads.

export interface ParsedVeriffDecision {
  sessionId: string;
  status: "approved" | "declined" | "resubmission_requested" | "pending" | "unknown";
  vendorData?: string;
  person?: {
    firstName?: string;
    lastName?: string;
    nationality?: string;
  };
  document?: {
    type?: string;
    country?: string;
    state?: string;
  };
}

export function normalizeVeriffStatus(
  raw: string | undefined,
  code?: number,
): ParsedVeriffDecision["status"] {
  if (raw === "approved" || code === 9001) return "approved";
  if (raw === "declined" || code === 9102) return "declined";
  if (raw === "resubmission_requested" || code === 9103) return "resubmission_requested";
  if (raw === "expired" || raw === "abandoned" || code === 9104 || code === 9121) return "unknown";
  if (raw === "submitted" || raw === "review") return "pending";
  return raw ? "unknown" : "pending";
}

export function parseVeriffDecisionPayload(
  data: Record<string, unknown>,
  fallbackSessionId?: string,
): ParsedVeriffDecision | null {
  const verification = (data.verification ?? data) as Record<string, unknown> | null;
  if (!verification || typeof verification !== "object") return null;

  const sessionId = String(verification.id ?? fallbackSessionId ?? "");
  if (!sessionId) return null;

  const status = normalizeVeriffStatus(
    verification.status as string | undefined,
    typeof verification.code === "number" ? verification.code : undefined,
  );

  if (status === "pending") return null;

  const person = verification.person as Record<string, unknown> | undefined;
  const document = verification.document as Record<string, unknown> | undefined;

  return {
    sessionId,
    status,
    vendorData: verification.vendorData as string | undefined,
    person: person ? {
      firstName: person.firstName as string | undefined,
      lastName: person.lastName as string | undefined,
      nationality: person.nationality as string | undefined,
    } : undefined,
    document: document ? {
      type: document.type as string | undefined,
      country: document.country as string | undefined,
      state: document.state as string | undefined,
    } : undefined,
  };
}
