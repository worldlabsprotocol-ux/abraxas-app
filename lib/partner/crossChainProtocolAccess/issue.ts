// FILE: lib/partner/crossChainProtocolAccess/issue.ts
// Presentation → Hosted Partner Flow receipt re-fetch → chain attestation. Presentation is never sufficient.

import { AbraxasPartnerKit, permitProtocolAction } from "@/lib/partner/integrationKit";
import { issueChainEligibilityAttestation } from "@/lib/partner/chainAttestation/issue";
import type { LocalIssuanceTestAdapter } from "@/lib/partner/onchainGateDeployments/bindIssuance";
import { verifyPresentationWithKit } from "@/lib/eligibilityPresentation";
import {
  CROSS_CHAIN_PROTOCOL_ACTION,
  CROSS_CHAIN_PROTOCOL_CLIENT_OVERRIDE_KEYS,
  CROSS_CHAIN_PROTOCOL_FORBIDDEN_KEYS,
  CROSS_CHAIN_PROTOCOL_SCOPE,
} from "./contract";

export function hasCrossChainClientOverride(body: unknown): boolean {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  return Object.keys(body as Record<string, unknown>).some((key) =>
    (CROSS_CHAIN_PROTOCOL_CLIENT_OVERRIDE_KEYS as readonly string[]).includes(key),
  );
}

export function crossChainPayloadLeaks(payload: unknown): string[] {
  const blob = JSON.stringify(payload ?? null).toLowerCase();
  return CROSS_CHAIN_PROTOCOL_FORBIDDEN_KEYS.filter((key) => {
    const needle = `"${key}"`;
    return blob.includes(needle);
  });
}

export interface IssueCrossChainProtocolAccessInput {
  kit: AbraxasPartnerKit;
  envelope: unknown;
  expected: {
    verifier_nonce: string;
    policy_id: string;
    policy_version: number;
    action: string;
    environment: "sandbox" | "production";
  };
  network_id: string;
  deployment_ref: string;
  application_id?: string;
  wallet_binding_hash?: string | null;
  wallet_binding_mode?: "not_attached" | "optional" | "required";
  testAdapter?: LocalIssuanceTestAdapter;
  now?: Date;
}

export async function issueCrossChainProtocolAccess(input: IssueCrossChainProtocolAccessInput) {
  const verified = await verifyPresentationWithKit(input.kit, input.envelope, input.expected);
  if (!verified.ok) {
    return {
      ok: false as const,
      reason: verified.reason,
      presentation_sufficient: false as const,
      client: {
        allowed: false,
        reason: verified.reason,
        presentation_sufficient: false,
      },
    };
  }

  const receiptId = verified.payload.receipt_verification_ref;
  const fetched = await input.kit.fetchPublicReceipt(receiptId);
  if (!fetched.ok) {
    return {
      ok: false as const,
      reason: "receipt_unavailable" as const,
      presentation_sufficient: false as const,
      client: {
        allowed: false,
        reason: "receipt_unavailable",
        presentation_sufficient: false,
      },
    };
  }
  const evaluated = input.kit.evaluateFetchedReceipt(fetched.receipt);
  if (!permitProtocolAction(evaluated)) {
    return {
      ok: false as const,
      reason: evaluated.outcome,
      presentation_sufficient: false as const,
      client: {
        allowed: false,
        reason: evaluated.outcome,
        presentation_sufficient: false,
      },
    };
  }

  const issued = await issueChainEligibilityAttestation({
    kit: input.kit,
    receiptId,
    action_type: CROSS_CHAIN_PROTOCOL_ACTION,
    action_scope: CROSS_CHAIN_PROTOCOL_SCOPE,
    network_id: input.network_id,
    deployment_ref: input.deployment_ref,
    application_id: input.application_id,
    wallet_binding_hash: input.wallet_binding_hash,
    wallet_binding_mode: input.wallet_binding_mode ?? "required",
    testAdapter: input.testAdapter,
    now: input.now,
  });

  if (!issued.ok) {
    return {
      ok: false as const,
      reason: issued.reason,
      presentation_sufficient: false as const,
      client: {
        ...issued.client,
        presentation_sufficient: false,
      },
    };
  }

  return {
    ok: true as const,
    presentation_sufficient: false as const,
    encoding: issued.encoding,
    attestation_id: issued.attestation_id,
    client: {
      ...issued.client,
      presentation_sufficient: false,
      encoding: issued.encoding,
    },
    fields: issued.fields,
  };
}
