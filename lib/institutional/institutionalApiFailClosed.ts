import { NextResponse } from "next/server";

export type InstitutionalApiErrorCode =
  | "institutional_handler_error"
  | "institutional_unavailable";

export function institutionalApiFailClosedResponse(input: {
  code: InstitutionalApiErrorCode;
  status?: number;
}): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error: "Service temporarily unavailable",
      code: input.code,
    },
    { status: input.status ?? 503 },
  );
}

export async function withInstitutionalApiFailClosed<T>(
  handler: () => Promise<T>,
): Promise<T | NextResponse> {
  try {
    return await handler();
  } catch {
    return institutionalApiFailClosedResponse({ code: "institutional_handler_error" });
  }
}
