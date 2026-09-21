// FILE: lib/partner/chainAttestation/project.ts
// Strict selective-disclosure projections.

import {
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
  schema_version: 2;
  network_id: string | null;
  environment: "sandbox" | "production" | null;
}

export function projectChainAttestationClient(view: ChainAttestationClientView): ChainAttestationClientView {
  return {
    allowed: view.allowed,
    reason: view.reason,
    action_binding: view.action_binding,
    expires_at: view.expires_at,
    schema_version: view.schema_version,
    network_id: view.network_id,
    environment: view.environment,
  };
}

export function chainAttestationHasForbiddenKeys(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  return Object.keys(value as Record<string, unknown>).filter((key) =>
    (CHAIN_ATTESTATION_FORBIDDEN_KEYS as readonly string[]).includes(key),
  );
}
