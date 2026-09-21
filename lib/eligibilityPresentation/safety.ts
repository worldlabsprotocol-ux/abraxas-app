// FILE: lib/eligibilityPresentation/safety.ts

import { detectDisclosureLeaks } from "@/lib/privacy/selectiveDisclosure";
import { ELIGIBILITY_PRESENTATION_FORBIDDEN_KEYS } from "./contract";

const NEEDLES = [
  "legal_name",
  "date_of_birth",
  "beneficial_owner",
  "corporate_document",
  "kyc_evidence",
  "kyb_evidence",
  "claims_json",
  "source_fact",
  "wallet_address",
  "callback_url",
  "private_key",
  "app_secret",
  "abx_live_",
  "provider_payload",
  "utila.api",
  "circle",
  "createTransfer",
  "placeOrder",
  "sendTransaction",
] as const;

export function presentationLeaks(payload: unknown): string[] {
  const leaks = [...detectDisclosureLeaks(payload)];
  if (!payload || typeof payload !== "object") return leaks;
  const keys = Object.keys(payload as Record<string, unknown>);
  for (const key of keys) {
    if ((ELIGIBILITY_PRESENTATION_FORBIDDEN_KEYS as readonly string[]).includes(key)) leaks.push(key);
  }
  const blob = JSON.stringify(payload).toLowerCase();
  for (const needle of NEEDLES) {
    if (blob.includes(needle.toLowerCase())) leaks.push(needle);
  }
  return [...new Set(leaks)];
}

export function presentationRequestOverride(body: unknown, allowed: readonly string[]): boolean {
  if (!body || typeof body !== "object" || Array.isArray(body)) return true;
  const record = body as Record<string, unknown>;
  return Object.keys(record).some((key) => !allowed.includes(key));
}
