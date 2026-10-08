// Deliberately request-independent: never include URL, subject, DOB, cookie, or token.
import { randomUUID } from "node:crypto";
import type { NextResponse } from "next/server";

export type HolderSessionDiagnosticRoute =
  | "hosted_bootstrap"
  | "browser_session"
  | "method_qualification"
  | "self_attestation";

export type HolderSessionFailureCategory =
  | "ok"
  | "authentication"
  | "expired"
  | "replay"
  | "binding"
  | "unavailable"
  | "invalid_request";

export function recordHolderSessionDiagnostic(
  response: NextResponse,
  route: HolderSessionDiagnosticRoute,
  category: HolderSessionFailureCategory,
): NextResponse {
  const correlationId = randomUUID();
  response.headers.set("X-Abraxas-Diagnostic-Id", correlationId);
  console.info("[holder-session-diagnostic]", JSON.stringify({
    route,
    status: response.status,
    category,
    correlation_id: correlationId,
  }));
  return response;
}
