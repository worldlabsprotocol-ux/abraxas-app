// FILE: lib/policy/publishPolicyDraftRpc.ts
// Parse atomic publish_partner_policy_draft RPC result.

import type { PartnerPolicy } from "@/lib/policy/types";
import { PolicyImmutabilityError } from "@/lib/policy/policyLifecycle";

export interface PublishPolicyDraftRpcResult {
  published: PartnerPolicy;
  deprecatedVersion: number | null;
}

export function mapPublishPolicyDraftRpcError(error: { message: string }): Error {
  const message = error.message;
  if (
    message.includes("only draft versions can be published")
    || message.includes("policy version not found")
    || message.includes("failed to activate draft")
    || message.includes("invariant violated")
  ) {
    return new PolicyImmutabilityError(message);
  }
  return new Error(message);
}

export function parsePublishPolicyDraftRpcResult(
  data: unknown,
): PublishPolicyDraftRpcResult {
  if (!data || typeof data !== "object") {
    throw new Error("publish_partner_policy_draft returned empty payload");
  }

  const payload = data as {
    published?: PartnerPolicy;
    deprecated_version?: number | null;
  };

  if (!payload.published?.id || payload.published.version == null) {
    throw new Error("publish_partner_policy_draft returned malformed published row");
  }

  return {
    published: payload.published,
    deprecatedVersion: payload.deprecated_version ?? null,
  };
}
