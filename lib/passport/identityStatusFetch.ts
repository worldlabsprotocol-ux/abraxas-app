// FILE: lib/passport/identityStatusFetch.ts
// Typed identity status fetch — distinguish session vs outage.

export type IdentityStatusFailureKind =
  | "session_required"
  | "forbidden"
  | "service_unavailable"
  | "network";

export class IdentityStatusFetchError extends Error {
  readonly kind: IdentityStatusFailureKind;
  readonly httpStatus: number;

  constructor(kind: IdentityStatusFailureKind, httpStatus: number, message: string) {
    super(message);
    this.name = "IdentityStatusFetchError";
    this.kind = kind;
    this.httpStatus = httpStatus;
  }
}

export function classifyIdentityStatusHttpStatus(status: number): IdentityStatusFailureKind {
  if (status === 401) return "session_required";
  if (status === 403) return "forbidden";
  if (status === 503) return "service_unavailable";
  if (status >= 500) return "service_unavailable";
  return "network";
}
