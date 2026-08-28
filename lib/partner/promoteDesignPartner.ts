// FILE: lib/partner/promoteDesignPartner.ts
// Promote design partner application → sandbox partner org + abx_test_ API key via atomic v2 RPC.

import { createClient } from "@supabase/supabase-js";
import type { AdminActorCategory } from "@/lib/admin/adminActorCategory";
import {
  createSandboxPromotionKeyMaterial,
  parsePromoteRpcResult,
  validatePromoteRpcInputs,
  type DesignPartnerPromoteRpcCode,
} from "@/lib/admin/designPartnerApplicationLifecycle";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const DESIGN_PARTNER_PROMOTE_RPC_V2 = "design_partner_promote_atomic_v2";

export interface PromoteResult {
  partner_id: string;
  api_key: string;
  key_prefix: string;
  application_id: string;
}

export class DesignPartnerPromoteError extends Error {
  constructor(readonly code: DesignPartnerPromoteRpcCode) {
    super(code);
    this.name = "DesignPartnerPromoteError";
  }
}

function mapRpcException(message: string): DesignPartnerPromoteRpcCode {
  if (message === "partner_id_conflict") return "partner_id_conflict";
  if (message === "key_insert_failed") return "key_insert_failed";
  return "promotion_failed";
}

export async function promoteDesignPartnerApplication(input: {
  applicationId: string;
  partnerId: string;
  actorCategory: AdminActorCategory;
}): Promise<PromoteResult> {
  if (!SB_URL || !SB_KEY) {
    throw new DesignPartnerPromoteError("promotion_failed");
  }

  const partnerId = input.partnerId.trim();
  const { raw, prefix, hash } = createSandboxPromotionKeyMaterial();

  const invalid = validatePromoteRpcInputs({
    applicationId: input.applicationId,
    partnerId,
    keyPrefix: prefix,
    keyHash: hash,
  });
  if (invalid) {
    throw new DesignPartnerPromoteError(invalid);
  }

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { data, error } = await sb.rpc(DESIGN_PARTNER_PROMOTE_RPC_V2, {
    p_application_id: input.applicationId,
    p_partner_id: partnerId,
    p_key_prefix: prefix,
    p_key_hash: hash,
    p_actor_category: input.actorCategory,
  });

  if (error) {
    throw new DesignPartnerPromoteError(mapRpcException(error.message));
  }

  const parsed = parsePromoteRpcResult(data);
  if (!parsed.ok || parsed.code !== "ok" || !parsed.partner_id || !parsed.key_prefix) {
    throw new DesignPartnerPromoteError(parsed.code);
  }

  return {
    partner_id: parsed.partner_id,
    api_key: raw,
    key_prefix: parsed.key_prefix,
    application_id: input.applicationId,
  };
}
