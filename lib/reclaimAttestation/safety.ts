// FILE: lib/reclaimAttestation/safety.ts

import { detectDisclosureLeaks } from "@/lib/privacy/selectiveDisclosure/leakDetector";
import { pickAllowedKeys } from "@/lib/privacy/selectiveDisclosure/enforce";
import {
  RECLAIM_BROWSER_CONFIG_KEYS,
  RECLAIM_PUBLIC_SESSION_KEYS,
} from "./contract";

const EXTRA_NEEDLES = [
  "reclaimprotocol_app_secret",
  "app_secret",
  "extracted_parameters",
  "extractedparameters",
  "raw_proof",
  "proof_json",
  "witness",
  "tee_attestation",
  "provider_payload",
  "callback_url",
  "date_of_birth",
  "legal_name",
];

export function reclaimPayloadLeaks(payload: unknown): string[] {
  const leaks = detectDisclosureLeaks(payload);
  const blob = JSON.stringify(payload ?? {}).toLowerCase();
  for (const needle of EXTRA_NEEDLES) {
    if (blob.includes(needle)) leaks.push(needle);
  }
  return leaks;
}

export function publicReclaimSessionView(record: Record<string, unknown>): Record<string, unknown> | null {
  return pickAllowedKeys(record, RECLAIM_PUBLIC_SESSION_KEYS);
}

export function publicReclaimBrowserConfig(record: Record<string, unknown>): Record<string, unknown> | null {
  return pickAllowedKeys(record, RECLAIM_BROWSER_CONFIG_KEYS);
}

export function stripSecretsFromRequestConfig(configJson: string): string {
  try {
    const parsed = JSON.parse(configJson) as Record<string, unknown>;
    delete parsed.appSecret;
    delete parsed.app_secret;
    delete parsed.secret;
    delete parsed.callbackUrl;
    delete parsed.callback_url;
    delete parsed.APPLICATION_SECRET;
    return JSON.stringify(parsed);
  } catch {
    return configJson;
  }
}
