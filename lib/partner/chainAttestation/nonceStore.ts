// FILE: lib/partner/chainAttestation/nonceStore.ts
// Durable one-time chain-attestation nonce consume. Separate from venue/payment nonces.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { hashUtf8 } from "./hashes";
import {
  ChainAttestationStoreUnavailableError,
  isChainAttestationSchemaMissing,
} from "./errors";

export async function consumeChainAttestationNonce(input: {
  partnerId: string;
  networkId: string;
  nonce: `0x${string}`;
  expiresAtIso: string;
}): Promise<"consumed" | "replayed" | "invalid" | "expired"> {
  const partner = input.partnerId.trim();
  const network = input.networkId.trim();
  const nonce = input.nonce.trim().toLowerCase();
  if (!partner || !network || !/^0x[0-9a-f]{64}$/.test(nonce)) return "invalid";
  let sb;
  try {
    sb = requireSupabaseAdmin();
  } catch {
    throw new ChainAttestationStoreUnavailableError();
  }
  const { data, error } = await sb.rpc("chain_attestation_consume_nonce", {
    p_partner_id: partner,
    p_network_id: network,
    p_nonce_hash: hashUtf8(`${partner}:${network}:${nonce}`).slice(2),
    p_expires_at: input.expiresAtIso,
  });
  if (isChainAttestationSchemaMissing(error) || error) {
    throw new ChainAttestationStoreUnavailableError();
  }
  const payload = data as { ok?: boolean; code?: string };
  if (payload?.ok) return "consumed";
  const code = String(payload?.code ?? "invalid");
  if (code === "replayed" || code === "expired") return code;
  return "invalid";
}
