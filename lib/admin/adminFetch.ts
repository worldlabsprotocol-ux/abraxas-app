// FILE: lib/admin/adminFetch.ts
// Session-cookie admin fetch — credentials included, never sends x-admin-pin.

const ADMIN_PIN_HEADER = "x-admin-pin";

function mergeHeaders(init?: HeadersInit): Headers {
  const headers = new Headers(init);
  headers.delete(ADMIN_PIN_HEADER);
  return headers;
}

/** Fetch for admin pages authorized via layout gate (PIN session cookie or email allowlist). */
export async function adminFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  return fetch(input, {
    ...init,
    credentials: "include",
    headers: mergeHeaders(init?.headers),
  });
}
