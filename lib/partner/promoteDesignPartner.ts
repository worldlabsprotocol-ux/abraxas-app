// FILE: lib/partner/promoteDesignPartner.ts
// Promote design partner application → sandbox partner org + abx_test_ API key via atomic RPC.

import { createClient } from "@supabase/supabase-js";
import {
  createSandboxPromotionKeyMaterial,
  parsePromoteRpcResult,
  validatePromoteRpcInputs,
  type DesignPartnerPromoteRpcCode,
} from "@/lib/admin/designPartnerApplicationLifecycle";
import { slugifyPartnerId } from "@/lib/partner/partnerOnboarding";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const PROMOTE_RPC = "design_partner_promote_atomic";

export interface DesignPartnerApplication {
  id: string;
  company: string;
  contact_name: string | null;
  email: string;
  use_case: string | null;
  integration_type: string | null;
  public_name_ok: boolean | null;
  status: string;
  promoted_partner_id: string | null;
}

export interface PromoteResult {
  partner_id: string;
  company: string;
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

export async function promoteDesignPartnerApplication(
  application: DesignPartnerApplication,
  options?: { partner_id?: string },
): Promise<PromoteResult> {
  if (!SB_URL || !SB_KEY) {
    throw new DesignPartnerPromoteError("promotion_failed");
  }

  const partnerId = options?.partner_id?.trim() || slugifyPartnerId(application.company);
  const { raw, prefix, hash } = createSandboxPromotionKeyMaterial();

  const invalid = validatePromoteRpcInputs({
    applicationId: application.id,
    partnerId,
    keyPrefix: prefix,
    keyHash: hash,
  });
  if (invalid) {
    throw new DesignPartnerPromoteError(invalid);
  }

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { data, error } = await sb.rpc(PROMOTE_RPC, {
    p_application_id: application.id,
    p_partner_id: partnerId,
    p_key_prefix: prefix,
    p_key_hash: hash,
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
    company: application.company,
    api_key: raw,
    key_prefix: parsed.key_prefix,
    application_id: application.id,
  };
}
