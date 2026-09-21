// FILE: lib/partner/chainAttestation/project.ts
// Strict selective-disclosure projections.

import { pickAllowedKeys } from "@/lib/privacy/selectiveDisclosure";
import {
  CHAIN_ATTESTATION_CLIENT_VISIBLE_KEYS,
  CHAIN_ATTESTATION_FORBIDDEN_KEYS,
  type ChainAttestationSafeReason,
} from "./contract";

export interface ChainAttestationClientView {
  allowed: boolean;
  reason: ChainAttestationSafeReason;
  action_binding: {
    action_type: string;
    action_scope: string;
    nonce_state: "issued" | "consumed" | "replayed" | "rejected";
    wallet_binding: "not_attached" | "optional" | "required";
  };
  expires_at: string | null;
  schema_version: 1;
  network_id: string | null;
  environment: "sandbox" | "production" | null;
}

export function projectChainAttestationClient(view: ChainAttestationClientView): ChainAttestationClientView {
  return pickAllowedKeys(view, CHAIN_ATTESTATION_CLIENT_VISIBLE_KEYS) as unknown as ChainAttestationClientView;
}

export function chainAttestationHasForbiddenKeys(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  return Object.keys(value as Record<string, unknown>).filter((key) =>
    (CHAIN_ATTESTATION_FORBIDDEN_KEYS as readonly string[]).includes(key),
  );
}
