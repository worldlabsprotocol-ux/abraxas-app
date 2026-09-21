import { ONCHAIN_GATE_CLIENT_AUTHORITY_KEYS } from "./contract";

export function launchpadRequestRejectsClientAuthority(body: unknown): boolean {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  return Object.keys(body as Record<string, unknown>).some((key) =>
    (ONCHAIN_GATE_CLIENT_AUTHORITY_KEYS as readonly string[]).includes(key),
  );
}
