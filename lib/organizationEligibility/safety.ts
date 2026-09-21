import { detectDisclosureLeaks } from "@/lib/privacy/selectiveDisclosure";
import { ORGANIZATION_CLIENT_OVERRIDE_KEYS, ORGANIZATION_FORBIDDEN_KEYS } from "./contract";

const NEEDLES = [
  "legal_name",
  "beneficial_owner",
  "incorporation",
  "tax_id",
  "kyb_evidence",
  "kyc_evidence",
  "provider_payload",
  "utila.api",
  "createTransfer",
  "sendTransaction",
  "circle",
  "private_key",
] as const;

export function organizationLeaks(payload: unknown): string[] {
  const leaks: string[] = [];
  detectDisclosureLeaks(payload).forEach((item) => leaks.push(item));
  if (!payload || typeof payload !== "object") return leaks;
  for (const key of Object.keys(payload as Record<string, unknown>)) {
    if ((ORGANIZATION_FORBIDDEN_KEYS as readonly string[]).includes(key)) leaks.push(key);
  }
  const blob = JSON.stringify(payload).toLowerCase();
  for (const needle of NEEDLES) {
    if (blob.includes(needle.toLowerCase())) leaks.push(needle);
  }
  return [...new Set(leaks)];
}

export function organizationClientOverride(body: unknown, allowed: readonly string[]): boolean {
  if (!body || typeof body !== "object" || Array.isArray(body)) return true;
  return Object.keys(body as Record<string, unknown>).some((key) => !allowed.includes(key));
}

export function organizationBrowserAuthority(body: unknown): boolean {
  if (!body || typeof body !== "object" || Array.isArray(body)) return true;
  return Object.keys(body as Record<string, unknown>).some((key) =>
    (ORGANIZATION_CLIENT_OVERRIDE_KEYS as readonly string[]).includes(key),
  );
}
